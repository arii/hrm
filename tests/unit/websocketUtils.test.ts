// File: tests/unit/websocketUtils.test.ts
/**
 * @jest-environment node
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { ConnectionMonitor } from '../../utils/websocketUtils'
import { ExtWebSocket } from '../../types/websocket'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { EventEmitter } from 'events'

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Create a mock WebSocket class that extends EventEmitter
class MockWebSocket extends EventEmitter {
  isAlive = true
  terminate = jest.fn()
  ping = jest.fn()
}

describe('ConnectionMonitor', () => {
  let wss: WebSocketServer
  let monitor: ConnectionMonitor
  let mockClients: Set<ExtWebSocket>

  beforeEach(() => {
    // Use the mock WebSocket server to avoid actual network operations
    wss = new WebSocketServer({ noServer: true })
    mockClients = new Set<ExtWebSocket>()
    // Correctly mock the 'clients' property which is a Set, not a getter
    Object.defineProperty(wss, 'clients', {
      get: () => mockClients,
    })
    jest.useFakeTimers()
    // Initialize monitor here to ensure it's always available for afterEach
    monitor = new ConnectionMonitor(wss, 1000)
  })

  afterEach(() => {
    monitor.stop()
    jest.useRealTimers()
    wss.close()
  })

  const createMockWebSocket = (): ExtWebSocket => {
    const ws = new MockWebSocket() as unknown as ExtWebSocket
    mockClients.add(ws)
    return ws
  }

  it('should terminate stale connections', () => {
    const client = createMockWebSocket()
    client.isAlive = false // Simulate a client that has not responded to a ping

    monitor.start()
    jest.advanceTimersByTime(1000)

    expect(client.terminate).toHaveBeenCalledTimes(1)
  })

  it('should not terminate active connections', () => {
    const client = createMockWebSocket()
    client.isAlive = true // Simulate a client that has responded to a ping

    monitor.start()
    jest.advanceTimersByTime(1000)

    expect(client.terminate).not.toHaveBeenCalled()
  })

  it('should ping all clients and set isAlive to false', () => {
    const client1 = createMockWebSocket()
    const client2 = createMockWebSocket()

    monitor.start()
    jest.advanceTimersByTime(1000)

    expect(client1.isAlive).toBe(false)
    expect(client1.ping).toHaveBeenCalledTimes(1)
    expect(client2.isAlive).toBe(false)
    expect(client2.ping).toHaveBeenCalledTimes(1)
  })

  it('should stop the monitoring interval', () => {
    const client = createMockWebSocket()

    monitor.start()
    monitor.stop()

    // Advance the timer to see if the interval is still running
    jest.advanceTimersByTime(1000)

    expect(client.ping).not.toHaveBeenCalled()
  })

  it('should be defined', () => {
    expect(ConnectionMonitor).toBeDefined()
  })
})
