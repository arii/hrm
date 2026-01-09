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

jest.mock('../../lib/env.js', () => ({
  env: {
    WEBSOCKET_WATCHDOG_INTERVAL: 30000,
    WEBSOCKET_PING_TIMEOUT: 15000,
  },
}))

class MockWebSocket extends EventEmitter implements Partial<ExtWebSocket> {
  clientId = `test-client-${Math.random()}`
  lastPong = Date.now()
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

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
    connectionMonitor = new ConnectionMonitor(
      mockWss,
      WATCHDOG_INTERVAL,
      WATCHDOG_INTERVAL / 2
    )
  })

  afterEach(() => {
    if (connectionMonitor) {
      connectionMonitor.stop()
    }
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
  })

  it('should start and stop the monitoring interval', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    connectionMonitor.start()
    expect(logger.info).toHaveBeenCalledWith(
      { interval: WATCHDOG_INTERVAL },
      'ConnectionMonitor started.'
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      WATCHDOG_INTERVAL
    )

    connectionMonitor.stop()
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('ConnectionMonitor stopped.')

    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('should terminate a client if a pong is not received within the timeout', () => {
    const unresponsiveClient = new MockWebSocket()
    unresponsiveClient.lastPong = Date.now() - WATCHDOG_INTERVAL * 2 // Last pong was long ago
    ;(mockWss.clients as Set<MockWebSocket>).add(unresponsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(unresponsiveClient.terminate).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      { clientId: unresponsiveClient.clientId },
      'Terminating stale WebSocket connection due to ping timeout.'
    )
  })

  it('should not terminate a client if a pong is received within the timeout', () => {
    const responsiveClient = new MockWebSocket()
    responsiveClient.lastPong = Date.now() // Fresh pong
    ;(mockWss.clients as Set<MockWebSocket>).add(responsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(responsiveClient.terminate).not.toHaveBeenCalled()
  })

  it('should handle multiple clients, terminating only the unresponsive one', () => {
    const responsiveClient = new MockWebSocket()
    responsiveClient.lastPong = Date.now()

    const unresponsiveClient = new MockWebSocket()
    unresponsiveClient.lastPong = Date.now() - WATCHDOG_INTERVAL * 2

    const anotherResponsiveClient = new MockWebSocket()
    anotherResponsiveClient.lastPong = Date.now()

    ;(mockWss.clients as Set<MockWebSocket>).add(responsiveClient)
    ;(mockWss.clients as Set<MockWebSocket>).add(unresponsiveClient)
    ;(mockWss.clients as Set<MockWebSocket>).add(anotherResponsiveClient)

    connectionMonitor.start()
    jest.advanceTimersByTime(WATCHDOG_INTERVAL)

    expect(responsiveClient.terminate).not.toHaveBeenCalled()
    expect(unresponsiveClient.terminate).toHaveBeenCalledTimes(1)
    expect(anotherResponsiveClient.terminate).not.toHaveBeenCalled()
  })
})
