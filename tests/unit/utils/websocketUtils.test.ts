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
import { ConnectionMonitor } from '../../../utils/websocketUtils'
import logger from '../../../utils/logger'
import { ExtWebSocket } from '@/types/websocket'
import { env } from '../../../lib/env'

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock the environment variables
jest.mock('../../../lib/env', () => ({
  env: {
    WEBSOCKET_PING_INTERVAL_MS: 5000,
    WEBSOCKET_PING_TIMEOUT_MS: 10000,
  },
}))

// Mock the 'ws' module
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as jest.Mocked<WebSocketServer>
    wss.clients = new Set<MockWebSocket>()
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter implements Partial<ExtWebSocket> {
  clientId = `test-client-${Math.random()}`
  terminate = jest.fn()
  ping = jest.fn()
  terminationTimeout?: NodeJS.Timeout

  // Other properties to satisfy the interface
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
  let setIntervalSpy: jest.SpyInstance
  let clearIntervalSpy: jest.SpyInstance
  let setTimeoutSpy: jest.SpyInstance
  let clearTimeoutSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    setIntervalSpy = jest.spyOn(global, 'setInterval')
    clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    setTimeoutSpy = jest.spyOn(global, 'setTimeout')
    clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
    connectionMonitor = new ConnectionMonitor(mockWss)
  })

  afterEach(() => {
    connectionMonitor.stop()
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  it('should start the monitoring interval with values from env', () => {
    connectionMonitor.start()
    expect(logger.info).toHaveBeenCalledWith(
      {
        pingInterval: env.WEBSOCKET_PING_INTERVAL_MS,
        pingTimeout: env.WEBSOCKET_PING_TIMEOUT_MS,
      },
      'ConnectionMonitor started.'
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      env.WEBSOCKET_PING_INTERVAL_MS
    )
  })

  it('should stop the monitoring interval and clear timeouts', () => {
    const client = new MockWebSocket()
    client.terminationTimeout = setTimeout(() => {}, 10000)
    ;(mockWss.clients as Set<MockWebSocket>).add(client)

    connectionMonitor.start()
    connectionMonitor.stop()

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(clearTimeoutSpy).toHaveBeenCalledWith(client.terminationTimeout)
    expect(logger.info).toHaveBeenCalledWith('ConnectionMonitor stopped.')
  })

  it('should ping a client and set a termination timeout', () => {
    const client = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(client)

    connectionMonitor.start()
    jest.advanceTimersByTime(env.WEBSOCKET_PING_INTERVAL_MS)

    expect(client.ping).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).toHaveBeenCalledWith(
      expect.any(Function),
      env.WEBSOCKET_PING_TIMEOUT_MS
    )
    expect(client.terminationTimeout).toBeDefined()
  })

  it('should terminate a client if the timeout is not cleared', () => {
    const client = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(client)

    connectionMonitor.start()

    // First interval triggers the ping and sets the timeout
    jest.advanceTimersByTime(env.WEBSOCKET_PING_INTERVAL_MS)

    expect(client.ping).toHaveBeenCalledTimes(1)
    expect(client.terminate).not.toHaveBeenCalled()

    // Advance time past the timeout duration
    jest.advanceTimersByTime(env.WEBSOCKET_PING_TIMEOUT_MS)

    expect(client.terminate).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      { clientId: client.clientId },
      'Terminating stale WebSocket connection due to ping timeout.'
    )
  })

  it('should handle multiple clients correctly', () => {
    const client1 = new MockWebSocket() // Will be terminated
    const client2 = new MockWebSocket() // Will "respond"
    ;(mockWss.clients as Set<MockWebSocket>).add(client1)
    ;(mockWss.clients as Set<MockWebSocket>).add(client2)

    connectionMonitor.start()
    jest.advanceTimersByTime(env.WEBSOCKET_PING_INTERVAL_MS)

    // Simulate client2 responding to the ping by clearing its timeout
    if (client2.terminationTimeout) {
      clearTimeout(client2.terminationTimeout)
    }

    // Advance time past the timeout
    jest.advanceTimersByTime(env.WEBSOCKET_PING_TIMEOUT_MS)

    expect(client1.terminate).toHaveBeenCalledTimes(1)
    expect(client2.terminate).not.toHaveBeenCalled()
  })

  it('should not start a new interval if one is already running', () => {
    connectionMonitor.start()
    connectionMonitor.start() // Attempt to start again
    expect(logger.warn).toHaveBeenCalledWith(
      'ConnectionMonitor is already running.'
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
  })

  it('should warn if ping timeout is less than or equal to ping interval', () => {
    // Temporarily modify the mock env for this specific test
    const originalEnv = { ...env }
    ;(env as { WEBSOCKET_PING_TIMEOUT_MS: number }).WEBSOCKET_PING_TIMEOUT_MS =
      3000
    ;(
      env as { WEBSOCKET_PING_INTERVAL_MS: number }
    ).WEBSOCKET_PING_INTERVAL_MS = 5000

    new ConnectionMonitor(mockWss)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(Object),
      'WEBSOCKET_PING_TIMEOUT_MS should be greater than WEBSOCKET_PING_INTERVAL_MS. Adjusting timeout to safe value.'
    )

    // Restore original env
    Object.assign(env, originalEnv)
  })
})
