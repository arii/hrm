/**
 * @jest-environment node
 */
import { WebSocketManager } from '../../../lib/websocket'
import { IWebSocket } from '../../../types/ws'
import { WebSocketServer, WebSocket } from 'ws'

// Mock the 'ws' library
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set(),
    handleUpgrade: jest.fn(),
  })),
  WebSocket: jest.fn(),
}))

// A helper to create a mock WebSocket client
const createMockWebSocket = (): IWebSocket => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws = new (WebSocket as any)() as IWebSocket
  ws.on = jest.fn()
  ws.ping = jest.fn()
  ws.terminate = jest.fn()
  ws.isAlive = false
  return ws
}

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager
  let wss: WebSocketServer

  beforeEach(() => {
    // Clear mock history before each test, especially before instantiation
    jest.clearAllMocks()
    jest.useFakeTimers()

    wsManager = new WebSocketManager()
    wss = wsManager.wss
  })

  afterEach(() => {
    jest.useRealTimers()
    wsManager.stopHeartbeat()
  })

  it('should initialize WebSocketServer and set up a connection listener', () => {
    expect(WebSocketServer).toHaveBeenCalledWith({ noServer: true })
    expect(wss.on).toHaveBeenCalledWith('connection', expect.any(Function))
  })

  describe('Heartbeat Mechanism', () => {
    it('should start the heartbeat interval when startHeartbeat is called', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval')
      wsManager.startHeartbeat()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
      setIntervalSpy.mockRestore()
    })

    it('should stop the heartbeat interval when stopHeartbeat is called', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      wsManager.startHeartbeat() // First, start it
      wsManager.stopHeartbeat()
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
      clearIntervalSpy.mockRestore()
    })

    it('should not try to clear an interval if one is not set', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      wsManager.stopHeartbeat()
      expect(clearIntervalSpy).not.toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })

    it('should ping all clients during a heartbeat check', () => {
      const ws1 = createMockWebSocket()
      const ws2 = createMockWebSocket()
      ws1.isAlive = true
      ws2.isAlive = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wss.clients.add(ws1 as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wss.clients.add(ws2 as any)

      wsManager.startHeartbeat()
      jest.advanceTimersByTime(60000)

      expect(ws1.ping).toHaveBeenCalledTimes(1)
      expect(ws2.ping).toHaveBeenCalledTimes(1)
    })

    it('should terminate an unresponsive client', () => {
      const unresponsiveClient = createMockWebSocket()
      unresponsiveClient.isAlive = true // Initially alive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wss.clients.add(unresponsiveClient as any)

      wsManager.startHeartbeat()

      // First interval runs, pings the client, and sets isAlive to false
      jest.advanceTimersByTime(60000)
      expect(unresponsiveClient.ping).toHaveBeenCalledTimes(1)
      expect(unresponsiveClient.isAlive).toBe(false)
      expect(unresponsiveClient.terminate).not.toHaveBeenCalled()

      // Client does not respond with a pong, so isAlive remains false.
      // Second interval runs and finds the client is not alive.
      jest.advanceTimersByTime(60000)
      expect(unresponsiveClient.terminate).toHaveBeenCalledTimes(1)
    })

    it('should not terminate a responsive client', () => {
      const responsiveClient = createMockWebSocket()
      responsiveClient.isAlive = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wss.clients.add(responsiveClient as any)

      // Simulate the 'pong' event handler that the WSS connection listener sets up
      const connectionCallback = (wss.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connection'
      )[1]

      connectionCallback(responsiveClient)
      const pongCallback = (responsiveClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'pong'
      )[1]

      wsManager.startHeartbeat()

      // First heartbeat cycle
      jest.advanceTimersByTime(60000)
      expect(responsiveClient.ping).toHaveBeenCalledTimes(1)
      expect(responsiveClient.isAlive).toBe(false) // Set to false before ping

      // Simulate a pong response
      pongCallback()
      expect(responsiveClient.isAlive).toBe(true) // Set back to true on pong

      // Second heartbeat cycle
      jest.advanceTimersByTime(60000)
      expect(responsiveClient.terminate).not.toHaveBeenCalled()
      expect(responsiveClient.ping).toHaveBeenCalledTimes(2)
    })
  })
})
