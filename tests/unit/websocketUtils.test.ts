/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { ConnectionMonitor } from '../../utils/websocketUtils'
import { ExtWebSocket } from '../../types/websocket'
import logger from '@/utils/logger'

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Manual mock for the 'ws' module
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as jest.Mocked<WebSocketServer>
    wss.clients = new Set<MockWebSocket>()
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter implements ExtWebSocket {
  clientId: string
  isAlive: boolean
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  readyState = 1
  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3
  binaryType = 'nodebuffer' as const
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  url = ''
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  dispatchEvent = jest.fn()
  onclose = null
  onerror = null
  onmessage = null
  onopen = null
  close = jest.fn()

  constructor(clientId: string, isAlive = true) {
    super()
    this.clientId = clientId
    this.isAlive = isAlive
  }

  // Simulate receiving a pong from the client
  receivePong() {
    this.emit('pong')
  }
}

describe('ConnectionMonitor', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let monitor: ConnectionMonitor

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>
  })

  afterEach(() => {
    monitor.stop()
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
  })

  it('should start and stop the watchdog interval', () => {
    monitor = new ConnectionMonitor(mockWss, 10000)
    const client = new MockWebSocket('client-1', true)
    ;(mockWss.clients as Set<MockWebSocket>).add(client)

    monitor.start()

    // Check that the interval runs once
    jest.advanceTimersByTime(10000)
    expect(client.ping).toHaveBeenCalledTimes(1)

    // Stop the monitor
    monitor.stop()

    // Advance the timer again and check that the interval does not run again
    jest.advanceTimersByTime(10000)
    expect(client.ping).toHaveBeenCalledTimes(1) // Should still be 1
  })

  it('should terminate clients that do not respond to pings', () => {
    const staleClient = new MockWebSocket('stale-client', true)
    staleClient.isAlive = false // Simulate a client that missed a pong
    ;(mockWss.clients as Set<MockWebSocket>).add(staleClient)

    monitor = new ConnectionMonitor(mockWss, 10000)
    monitor.start()

    jest.advanceTimersByTime(10000)

    expect(staleClient.terminate).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      { clientId: 'stale-client' },
      'Terminating stale WebSocket connection due to no pong response.'
    )
  })

  it('should not terminate responsive clients', () => {
    const activeClient = new MockWebSocket('active-client', true)
    ;(mockWss.clients as Set<MockWebSocket>).add(activeClient)

    monitor = new ConnectionMonitor(mockWss, 10000)
    monitor.start()

    // First interval: sets isAlive to false and pings
    jest.advanceTimersByTime(10000)
    expect(activeClient.isAlive).toBe(false)
    expect(activeClient.ping).toHaveBeenCalled()
    expect(activeClient.terminate).not.toHaveBeenCalled()

    // Simulate client responding with a pong
    activeClient.isAlive = true

    // Second interval: client is alive, so it shouldn't be terminated
    jest.advanceTimersByTime(10000)
    expect(activeClient.terminate).not.toHaveBeenCalled()
  })

  it('should set isAlive to false and ping clients on each interval', () => {
    const client1 = new MockWebSocket('client-1', true)
    const client2 = new MockWebSocket('client-2', true)
    ;(mockWss.clients as Set<MockWebSocket>).add(client1)
    ;(mockWss.clients as Set<MockWebSocket>).add(client2)

    monitor = new ConnectionMonitor(mockWss, 10000)
    monitor.start()

    jest.advanceTimersByTime(10000)

    expect(client1.isAlive).toBe(false)
    expect(client1.ping).toHaveBeenCalledTimes(1)
    expect(client2.isAlive).toBe(false)
    expect(client2.ping).toHaveBeenCalledTimes(1)
  })
})
