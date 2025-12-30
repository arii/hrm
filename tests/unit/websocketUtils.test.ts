/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { ConnectionMonitor } from '../../utils/websocketUtils'
import logger from '../../utils/logger'
import { ExtWebSocket } from '../../types'

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock the 'ws' module to control the WebSocket server and clients
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as jest.Mocked<WebSocketServer>
    wss.clients = new Set<MockWebSocket>()
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter {
  isAlive = true
  clientId = `test-client-${Math.random()}`
  terminate = jest.fn()
  ping = jest.fn()
  pong = (): void => {}
  send = (): void => {}
  close = (): void => {}
  readyState = 1
  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3
  binaryType = 'nodebuffer'
}

describe('ConnectionMonitor', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let connectionMonitor: ConnectionMonitor
  const WATCHDOG_INTERVAL = 5000 // Use a shorter interval for testing
  let setIntervalSpy: jest.SpyInstance<any>
  let clearIntervalSpy: jest.SpyInstance<any>

  beforeEach(() => {
    jest.useFakeTimers()
    setIntervalSpy = jest.spyOn(global, 'setInterval')
    clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
    // Note: ConnectionMonitor is instantiated in each test to allow for env var manipulation
  })

  afterEach(() => {
    if (connectionMonitor) {
      connectionMonitor.stop()
    }
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<any>).clear()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('should start the monitoring interval', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    connectionMonitor.start()
    expect(logger.info).toHaveBeenCalledWith(
      { interval: WATCHDOG_INTERVAL },
      'ConnectionMonitor started.'
    )
    // Check if setInterval has been called
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      WATCHDOG_INTERVAL
    )
  })

  it('should stop the monitoring interval', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    connectionMonitor.start()
    connectionMonitor.stop()
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('ConnectionMonitor stopped.')
  })

  it('should terminate a client if isAlive is false', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    const unresponsiveClient = new MockWebSocket() as any
    unresponsiveClient.isAlive = false // Simulate a client that missed a pong
    ;(mockWss.clients as Set<any>).add(unresponsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(unresponsiveClient.terminate).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      { clientId: unresponsiveClient.clientId },
      'Terminating stale WebSocket connection due to missed heartbeat.'
    )
  })

  it('should NOT terminate a client if isAlive is true', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    const responsiveClient = new MockWebSocket() as any
    responsiveClient.isAlive = true
    ;(mockWss.clients as Set<any>).add(responsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(responsiveClient.terminate).not.toHaveBeenCalled()
  })

  it('should set isAlive to false and ping active clients', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    const activeClient = new MockWebSocket() as any
    activeClient.isAlive = true
    ;(mockWss.clients as Set<any>).add(activeClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(activeClient.isAlive).toBe(false)
    expect(activeClient.ping).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple clients correctly', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    const client1 = new MockWebSocket() as any // Responsive
    const client2 = new MockWebSocket() as any // Unresponsive
    const client3 = new MockWebSocket() as any // Responsive

    client2.isAlive = false
    ;(mockWss.clients as Set<any>).add(client1)
    ;(mockWss.clients as Set<any>).add(client2)
    ;(mockWss.clients as Set<any>).add(client3)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    // Check responsive clients
    expect(client1.isAlive).toBe(false)
    expect(client1.ping).toHaveBeenCalledTimes(1)
    expect(client1.terminate).not.toHaveBeenCalled()

    expect(client3.isAlive).toBe(false)
    expect(client3.ping).toHaveBeenCalledTimes(1)
    expect(client3.terminate).not.toHaveBeenCalled()

    // Check unresponsive client
    expect(client2.terminate).toHaveBeenCalledTimes(1)
  })

  it('should not start a new interval if one is already running', () => {
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
    connectionMonitor.start()
    connectionMonitor.start() // Attempt to start again
    expect(logger.warn).toHaveBeenCalledWith(
      'ConnectionMonitor is already running.'
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1) // Should only be called once
  })

  describe('Constructor Interval Validation', () => {
    afterEach(() => {
      delete process.env.WEBSOCKET_WATCHDOG_INTERVAL
    })

    it('should use the provided watchdogInterval if valid', () => {
      const monitor = new ConnectionMonitor(mockWss, 10000)
      monitor.start()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000)
    })

    it('should fall back to default if provided interval is zero or negative', () => {
      const monitor = new ConnectionMonitor(mockWss, 0)
      monitor.start()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Watchdog interval must be a positive integer. Using fallback.'
      )
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('should use the environment variable if no argument is provided', () => {
      process.env.WEBSOCKET_WATCHDOG_INTERVAL = '15000'
      const monitor = new ConnectionMonitor(mockWss)
      monitor.start()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000)
    })

    it('should fall back to default if environment variable is invalid', () => {
      process.env.WEBSOCKET_WATCHDOG_INTERVAL = 'invalid'
      const monitor = new ConnectionMonitor(mockWss)
      monitor.start()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Invalid WEBSOCKET_WATCHDOG_INTERVAL. Using fallback.'
      )
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('should use the default of 30000 if nothing is provided', () => {
      const monitor = new ConnectionMonitor(mockWss)
      monitor.start()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })
  })
})
