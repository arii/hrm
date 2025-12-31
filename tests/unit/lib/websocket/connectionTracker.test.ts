/**
 * @jest-environment node
 */
import { handleConnectionLimit } from '../../../../lib/websocket/connectionTracker'
import { env } from '../../../../lib/env'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import { EventEmitter } from 'events'

// Mock the env module to control NODE_ENV for tests
jest.mock('../../../../lib/env', () => ({
  env: {
    NODE_ENV: 'production',
    WS_MAX_CONNECTIONS: 5,
  },
}))

// A mock Socket that extends EventEmitter to allow for 'close' event simulation
class MockSocket extends EventEmitter {
  remoteAddress = '127.0.0.1'
  destroyed = false
  buffer: string[] = []

  write(data: string) {
    this.buffer.push(data)
    return true
  }

  destroy() {
    this.destroyed = true
  }

  // Simulate closing the connection
  close() {
    this.emit('close')
  }
}

import { _private as connectionTrackerPrivate } from '../../../../lib/websocket/connectionTracker'

describe('WebSocket Connection Tracker', () => {
  let mockSocket: MockSocket
  let mockReq: IncomingMessage

  beforeEach(() => {
    // Reset mocks and environment before each test
    jest.clearAllMocks()
    ;(env as { NODE_ENV: string }).NODE_ENV = 'production'
    mockSocket = new MockSocket()
    mockReq = {
      headers: {},
      socket: mockSocket,
    } as unknown as IncomingMessage

    // Use the exported reset function to clear the connection map before each test
    connectionTrackerPrivate.resetWsConnections()
  })

  it('should return true and not track connections when NODE_ENV is "test"', () => {
    ;(env as { NODE_ENV: string }).NODE_ENV = 'test'
    const result = handleConnectionLimit(
      mockReq,
      mockSocket as unknown as Socket
    )
    expect(result).toBe(true)
    expect(mockSocket.destroyed).toBe(false)
  })

  it('should allow a connection if the limit is not reached', () => {
    const result = handleConnectionLimit(
      mockReq,
      mockSocket as unknown as Socket
    )
    expect(result).toBe(true)
    expect(mockSocket.destroyed).toBe(false)
  })

  it('should reject a connection if the limit is exceeded', () => {
    // Simulate 5 existing connections from the same IP
    for (let i = 0; i < 5; i++) {
      const socket = new MockSocket()
      const req = {
        headers: {},
        socket,
      } as unknown as IncomingMessage
      handleConnectionLimit(req, socket as unknown as Socket)
    }

    // The 6th connection should be rejected
    const result = handleConnectionLimit(
      mockReq,
      mockSocket as unknown as Socket
    )
    expect(result).toBe(false)
    expect(mockSocket.destroyed).toBe(true)
    expect(mockSocket.buffer.join('')).toContain(
      'HTTP/1.1 429 Too Many Requests'
    )
  })

  it('should decrement the connection count when a socket is closed', () => {
    // Establish a connection
    handleConnectionLimit(mockReq, mockSocket as unknown as Socket)

    // Close the socket
    mockSocket.close()

    // Now, there should be room for 5 more connections
    for (let i = 0; i < 5; i++) {
      const socket = new MockSocket()
      const result = handleConnectionLimit(mockReq, socket as unknown as Socket)
      expect(result).toBe(true)
    }

    // The 6th new connection (7th total) should be rejected
    const finalSocket = new MockSocket()
    const finalResult = handleConnectionLimit(
      mockReq,
      finalSocket as unknown as Socket
    )
    expect(finalResult).toBe(false)
    expect(finalSocket.destroyed).toBe(true)
  })

  it('should use x-forwarded-for header for IP address', () => {
    mockReq.headers['x-forwarded-for'] = '1.1.1.1'
    const result = handleConnectionLimit(
      mockReq,
      mockSocket as unknown as Socket
    )
    expect(result).toBe(true)
  })

  it('should allow the connection if no IP can be determined', () => {
    // No x-forwarded-for and no remoteAddress on the socket
    const socketWithoutIp = new MockSocket()
    socketWithoutIp.remoteAddress = ''
    const reqWithoutIp = {
      headers: {},
      socket: socketWithoutIp,
    } as unknown as IncomingMessage

    const result = handleConnectionLimit(
      reqWithoutIp,
      socketWithoutIp as unknown as Socket
    )
    expect(result).toBe(true)
  })
})
