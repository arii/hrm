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
import { ExtWebSocket } from '@/types/websocket'

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

class MockWebSocket extends EventEmitter implements Partial<ExtWebSocket> {
  isAlive = true
  clientId = `test-client-${Math.random()}`
  terminate = jest.fn()
  ping = jest.fn()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  pong = (): void => {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  send = (): void => {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
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
  let setIntervalSpy: jest.SpyInstance
  let clearIntervalSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    setIntervalSpy = jest.spyOn(global, 'setInterval')
    clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    mockWss = new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
    connectionMonitor = new ConnectionMonitor(mockWss, WATCHDOG_INTERVAL)
  })

  afterEach(() => {
    connectionMonitor.stop()
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('should start the monitoring interval', () => {
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
    connectionMonitor.start()
    connectionMonitor.stop()
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('ConnectionMonitor stopped.')
  })

  it('should terminate a client if isAlive is false', () => {
    const unresponsiveClient = new MockWebSocket()
    unresponsiveClient.isAlive = false // Simulate a client that missed a pong
    ;(mockWss.clients as Set<MockWebSocket>).add(unresponsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(unresponsiveClient.terminate).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      { clientId: unresponsiveClient.clientId },
      'Terminating stale WebSocket connection due to missed heartbeat.'
    )
  })

  it('should NOT terminate a client if isAlive is true', () => {
    const responsiveClient = new MockWebSocket()
    responsiveClient.isAlive = true
    ;(mockWss.clients as Set<MockWebSocket>).add(responsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(responsiveClient.terminate).not.toHaveBeenCalled()
  })

  it('should set isAlive to false and ping active clients', () => {
    const activeClient = new MockWebSocket()
    activeClient.isAlive = true
    ;(mockWss.clients as Set<MockWebSocket>).add(activeClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(activeClient.isAlive).toBe(false)
    expect(activeClient.ping).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple clients correctly', () => {
    const client1 = new MockWebSocket() // Responsive
    const client2 = new MockWebSocket() // Unresponsive
    const client3 = new MockWebSocket() // Responsive

    client2.isAlive = false
    ;(mockWss.clients as Set<MockWebSocket>).add(client1)
    ;(mockWss.clients as Set<MockWebSocket>).add(client2)
    ;(mockWss.clients as Set<MockWebSocket>).add(client3)

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
    connectionMonitor.start()
    connectionMonitor.start() // Attempt to start again
    expect(logger.warn).toHaveBeenCalledWith(
      'ConnectionMonitor is already running.'
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1) // Should only be called once
  })
})
