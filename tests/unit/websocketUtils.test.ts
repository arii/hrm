/**
 * @jest-environment node
 */
import {
  sendWebSocketMessage,
  broadcast,
  ConnectionMonitor,
} from '@/utils/websocketUtils'
import { WebSocket, Server as WebSocketServer } from 'ws'
import { ExtWebSocket } from '@/types/websocket'
import logger from '@/utils/logger'

// Mock the logger to prevent console output during tests
jest.mock('@/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}))

// Mock WebSocket and WebSocketServer
jest.mock('ws', () => ({
  ...jest.requireActual('ws'),
  WebSocket: jest.fn().mockImplementation(() => ({
    readyState: 1, // WebSocket.OPEN
    send: jest.fn(),
    terminate: jest.fn(),
    ping: jest.fn(),
    isAlive: true,
  })),
  Server: jest.fn().mockImplementation(() => ({
    clients: new Set(),
  })),
}))

// Type assertion for our mocked WebSocket
type MockWebSocket = jest.Mocked<ExtWebSocket> & {
  readyState: number
  isAlive: boolean
}

describe('WebSocket Utilities', () => {
  let mockWs: MockWebSocket

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    mockWs = new (WebSocket as jest.Mock)() as MockWebSocket
  })

  describe('sendWebSocketMessage', () => {
    it('should send a message to an open socket', () => {
      const message = { type: 'PONG' }
      sendWebSocketMessage(mockWs, message)
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should not send a message to a closed socket', () => {
      mockWs.readyState = WebSocket.CLOSED
      const message = { type: 'PONG' }
      sendWebSocketMessage(mockWs, message)
      expect(mockWs.send).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should log an error if sending fails', () => {
      const error = new Error('Send failed')
      mockWs.send.mockImplementationOnce(() => {
        throw error
      })
      const message = { type: 'PONG' }
      sendWebSocketMessage(mockWs, message)
      expect(logger.error).toHaveBeenCalledWith(
        expect.anything(),
        'Failed to send WebSocket message.'
      )
    })
  })

  describe('broadcast', () => {
    let mockWss: jest.Mocked<WebSocketServer>

    beforeEach(() => {
      // Correctly instantiate the mocked server
      mockWss = new (WebSocketServer as jest.Mock)({
        noServer: true,
      }) as jest.Mocked<WebSocketServer>
    })

    it('should send a message to all open clients', () => {
      const client1 = new (WebSocket as jest.Mock)() as MockWebSocket
      const client2 = new (WebSocket as jest.Mock)() as MockWebSocket
      const client3 = new (WebSocket as jest.Mock)() as MockWebSocket
      client3.readyState = WebSocket.CLOSED
      ;(mockWss.clients as Set<WebSocket>).add(client1).add(client2).add(client3)

      const message = { type: 'HRM_UPDATE', payload: [] }
      broadcast(mockWss, message)

      expect(client1.send).toHaveBeenCalledTimes(1)
      expect(client2.send).toHaveBeenCalledTimes(1)
      expect(client3.send).not.toHaveBeenCalled()
    })

    it('should handle errors when sending to a client during broadcast', () => {
      const client1 = new (WebSocket as jest.Mock)() as MockWebSocket
      const client2 = new (WebSocket as jest.Mock)() as MockWebSocket
      client2.send.mockImplementationOnce(() => {
        throw new Error('Send failed')
      })
      ;(mockWss.clients as Set<WebSocket>).add(client1).add(client2)

      const message = { type: 'HRM_UPDATE', payload: [] }
      broadcast(mockWss, message)

      expect(client1.send).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        expect.anything(),
        'Failed to broadcast WebSocket message to a client.'
      )
    })
  })

  describe('ConnectionMonitor', () => {
    let mockWss: jest.Mocked<WebSocketServer>
    let connectionMonitor: ConnectionMonitor
    let setIntervalSpy: jest.SpyInstance
    let clearIntervalSpy: jest.SpyInstance

    beforeEach(() => {
      jest.useFakeTimers()
      setIntervalSpy = jest.spyOn(global, 'setInterval')
      clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      mockWss = new (WebSocketServer as jest.Mock)({
        noServer: true,
      }) as jest.Mocked<WebSocketServer>
    })

    afterEach(() => {
      if (connectionMonitor) connectionMonitor.stop()
      jest.useRealTimers()
      jest.clearAllMocks()
    })

    it('should start a watchdog interval', () => {
      connectionMonitor = new ConnectionMonitor(mockWss)
      connectionMonitor.start()
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000
      ) // Default interval
    })

    it('should terminate stale connections', () => {
      const staleClient = new (WebSocket as jest.Mock)() as MockWebSocket
      staleClient.isAlive = false
      ;(mockWss.clients as Set<WebSocket>).add(staleClient)

      connectionMonitor = new ConnectionMonitor(mockWss)
      connectionMonitor.start()

      jest.advanceTimersByTime(30000)

      expect(staleClient.terminate).toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.anything(),
        'Terminating stale WebSocket connection due to missed heartbeat.'
      )
    })

    it('should set isAlive to false and ping active clients', () => {
      const activeClient = new (WebSocket as jest.Mock)() as MockWebSocket
      activeClient.isAlive = true
      ;(mockWss.clients as Set<WebSocket>).add(activeClient)

      connectionMonitor = new ConnectionMonitor(mockWss)
      connectionMonitor.start()
      jest.advanceTimersByTime(30000)

      expect(activeClient.isAlive).toBe(false)
      expect(activeClient.ping).toHaveBeenCalled()
    })

    // ... other ConnectionMonitor tests
  })
})
