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
import { IncomingMessage } from 'http'
import {
  initSocketManager,
  resetSocketManager,
  getRequestParams,
  hrmDataRepository,
} from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import {
  StateSnapshot,
  ClientCommandMessageSchema,
  ExtWebSocket,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock ConnectionMonitor and other utils
jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(),
  ConnectionMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

// Mock logger globally for the test file
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
    const originalOn = wss.on.bind(wss)
    const originalEmit = wss.emit.bind(wss)
    wss.on = jest.fn(
      (event: string, listener: (...args: unknown[]) => void) => {
        return originalOn(event, listener)
      }
    )
    wss.emit = jest.fn((event: string, ...args: unknown[]) => {
      return originalEmit(event, ...args)
    })
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter {
  isAlive: boolean
  clientType: string | undefined
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  clientId?: string

  constructor() {
    super()
    this.isAlive = true
  }

  // Simulate receiving a pong from the client
  receivePong() {
    this.emit('pong')
  }

  // Override 'on' to correctly handle our event emitter
  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    super.on(event, listener)
    return this
  }
}

describe('WebSocket Manager', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let mockServices: {
    tabataService: jest.Mocked<TabataTimer>
    spotifyService: jest.Mocked<SpotifyPolling>
  }
  let getSnapshot: () => StateSnapshot
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>

    // Create fully typed mocks for the services.
    const mockTabataTimer: jest.Mocked<TabataTimer> = {
      handleCommand: jest.fn(),
      setMode: jest.fn(),
      setConfig: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      getState: jest.fn(),
      getSnapshot: jest.fn(),
      cleanup: jest.fn(),
    }

    const mockSpotifyPolling: jest.Mocked<SpotifyPolling> = {
      handleCommand: jest.fn(),
      forcePollAndBroadcast: jest.fn(),
      getState: jest.fn(),
      isReady: jest.fn(),
      handleTokenUpdate: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      cleanup: jest.fn(),
      refreshDevices: jest.fn(),
    }

    mockServices = {
      tabataService: mockTabataTimer,
      spotifyService: mockSpotifyPolling,
    }

    getSnapshot = jest.fn().mockReturnValue({
      timer: {},
      spotify: {},
    })

    initSocketManager(mockWss, getSnapshot, mockServices)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    resetSocketManager()
  })

  describe('Connection Monitoring', () => {
    it('should initialize and start the ConnectionMonitor', () => {
      expect(ConnectionMonitor).toHaveBeenCalledWith(mockWss)
      const monitorInstance = (ConnectionMonitor as jest.Mock).mock.results[0]
        .value
      expect(monitorInstance.start).toHaveBeenCalled()
    })

    it('should set isAlive to true on new connection', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      const mockReq = { url: '/', headers: { host: 'localhost' } }
      mockWss.emit('connection', newWs, mockReq)
      expect(newWs.isAlive).toBe(true)
    })

    it('should set isAlive to true on pong', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      const mockReq = { url: '/', headers: { host: 'localhost' } }
      mockWss.emit('connection', newWs, mockReq)
      newWs.isAlive = false // Manually set to false
      newWs.emit('pong')
      expect(newWs.isAlive).toBe(true)
    })

    it('should stop the ConnectionMonitor when the server closes', () => {
      mockWss.emit('close')
      const monitorInstance = (ConnectionMonitor as jest.Mock).mock.results[0]
        .value
      expect(monitorInstance.stop).toHaveBeenCalled()
    })
  })

  describe('Calorie Calculation', () => {
    it('should accumulate calories correctly with small frequent updates', () => {
      const clientId = '11111111-1111-1111-1111-111111111111'
      mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      const mockReq = {
        url: `/?clientId=${clientId}`,
        headers: { host: 'localhost' },
      }
      mockWss.emit('connection', mockWs, mockReq)

      const sendHrmInput = (hr: number) => {
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: hr, age: 30, weight: 75 },
        })
        mockWs.emit('message', message.toString())
      }

      // Initial input
      sendHrmInput(150)

      // Send 200 updates, each 100ms apart
      // Should accumulate significant calories even if each step < 0.1 kcal
      for (let i = 0; i < 200; i++) {
        jest.advanceTimersByTime(100) // 100ms
        sendHrmInput(150)
      }

      // Check the repository directly
      const clientData = hrmDataRepository.findById(clientId)

      expect(clientData!.calories).toBeGreaterThan(0.1)
      // A more precise check based on the known formula for short duration.
      // 200 updates * 100ms = 20 seconds = 0.3333 minutes.
      // With HR=150, Age=30, Weight=75, the calories should be roughly > 2.
      expect(clientData!.calories).toBeGreaterThan(2)
    })
  })

  describe('Message Handling', () => {
    beforeEach(() => {
      mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      const mockReq = {
        url: '/?clientId=11111111-1111-1111-1111-111111111111',
        headers: { host: 'localhost' },
      }
      mockWss.emit('connection', mockWs, mockReq)
    })

    it('should handle REGISTER_CLIENT message', () => {
      const message = JSON.stringify({
        type: 'REGISTER_CLIENT',
        role: 'dashboard',
      })
      mockWs.emit('message', message.toString())
      expect(mockWs.clientType).toBe('dashboard')
    })

    it('should send initial state on GET_STATE message', () => {
      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message.toString())

      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.type).toBe('INITIAL_STATE')
      expect(sentData.payload).toHaveProperty('timer')
      expect(sentData.payload).toHaveProperty('spotify')
      expect(sentData.payload).toHaveProperty('hrmData')
    })

    it('should handle invalid JSON gracefully', () => {
      mockWs.emit('message', 'invalid json')
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object),
        'Error processing incoming message'
      )
    })

    it('should handle Zod validation errors gracefully', () => {
      const message = JSON.stringify({ type: 'INVALID_TYPE' })
      mockWs.emit('message', message.toString())
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object),
        'WebSocket message validation failed'
      )
    })

    it('should broadcast state on client disconnect', () => {
      mockWs.emit('close')

      // Fast-forward timers to trigger the setTimeout in the close handler
      jest.runOnlyPendingTimers()

      expect(broadcast).toHaveBeenCalledWith(
        mockWss,
        {
          type: 'HRM_UPDATE',
          payload: [],
        },
        'socketManager.broadcastState'
      )
    })

    it('should not delete client data if they reconnect within the grace period', () => {
      // 1. A client is connected
      const clientId = '22222222-2222-2222-2222-222222222222'
      const mockReq = {
        url: `/?clientId=${clientId}`,
        headers: { host: 'localhost' },
      }
      const firstWs = new MockWebSocket()
      mockWss.emit('connection', firstWs, mockReq)

      // Verify the user was added
      let message = JSON.stringify({ type: 'GET_STATE' })
      firstWs.emit('message', message)
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.payload.hrmData).toEqual(
        expect.arrayContaining([expect.objectContaining({ clientId })])
      )

      // 2. The client disconnects
      firstWs.emit('close')

      // 3. Time advances, but less than the grace period
      jest.advanceTimersByTime(3000) // 3 seconds

      // 4. The client reconnects with the same ID
      const secondWs = new MockWebSocket()
      mockWss.emit('connection', secondWs, mockReq)

      // 5. The original timer now fires
      jest.runOnlyPendingTimers()

      // 6. Verify the broadcast to delete the user was NOT called
      //    (because a new socket for that client exists)
      expect(broadcast).not.toHaveBeenCalledWith(
        mockWss,
        {
          type: 'HRM_UPDATE',
          payload: [], // This would be the payload on final deletion
        },
        'socketManager.broadcastState'
      )

      // 7. Verify the user's data still exists
      message = JSON.stringify({ type: 'GET_STATE' })
      secondWs.emit('message', message)
      const finalSentData = (sendWebSocketMessage as jest.Mock).mock.calls[1][1]
      expect(finalSentData.payload.hrmData).toEqual(
        expect.arrayContaining([expect.objectContaining({ clientId })])
      )
    })

    it('should forward SPOTIFY_COMMAND to dashboard clients', () => {
      const dashboardWs = new MockWebSocket()
      dashboardWs.clientType = 'dashboard'
      const controllerWs = new MockWebSocket()
      controllerWs.clientType = 'controller'
      ;(mockWss.clients as Set<MockWebSocket>).add(dashboardWs)
      ;(mockWss.clients as Set<MockWebSocket>).add(controllerWs)

      const message = JSON.stringify({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
      })
      mockWs.emit('message', message.toString())

      expect(sendWebSocketMessage).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalledWith(
        dashboardWs,
        expect.objectContaining({ type: 'EXECUTE_SPOTIFY' }),
        'socketManager.SPOTIFY_COMMAND'
      )
      expect(mockServices.spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        {
          deviceId: undefined,
          volume: undefined,
          playlistUri: undefined,
          contextUri: undefined,
        }
      )
    })

    it('should extract contextUri and playlistUri from SPOTIFY_COMMAND', () => {
      const message = JSON.stringify({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'test_device',
        volume: 50,
        playlistUri: 'spotify:playlist:123',
        contextUri: 'spotify:album:456',
      })
      mockWs.emit('message', message.toString())

      expect(mockServices.spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        {
          deviceId: 'test_device',
          volume: 50,
          playlistUri: 'spotify:playlist:123',
          contextUri: 'spotify:album:456',
        }
      )
    })

    it('should handle unknown message types', () => {
      const message = JSON.stringify({ type: 'SOME_GARBAGE' })
      jest
        .spyOn(ClientCommandMessageSchema, 'parse')
        .mockReturnValue({ type: 'SOME_GARBAGE' })

      mockWs.emit('message', message.toString())

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Unknown message type received'
      )
    })
  })
  describe('getRequestParams', () => {
    beforeEach(() => {
      ;(logger.error as jest.Mock).mockClear()
    })

    it('should correctly parse clientId from a standard URL', () => {
      const req = {
        url: '/?clientId=abcdef-123456',
        headers: { host: 'localhost:3000' },
      }
      const params = getRequestParams(req as IncomingMessage)
      expect(params.get('clientId')).toBe('abcdef-123456')
    })

    it('should return empty params and log an error when URL is malformed', () => {
      const req = {
        url: 'a',
        headers: { host: 'a:b:c' },
      }
      const params = getRequestParams(req as IncomingMessage)
      expect(params.toString()).toBe('')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle missing host header by falling back to localhost', () => {
      const req = { url: '/?foo=bar', headers: {} }
      const params = getRequestParams(req as IncomingMessage)
      expect(params.get('foo')).toBe('bar')
    })

    it('should handle missing URL by defaulting to "/"', () => {
      const req = { headers: { host: 'testhost' } }
      const params = getRequestParams(req as IncomingMessage)
      expect(params.toString()).toBe('')
    })

    it('should handle multiple query parameters', () => {
      const req = {
        url: '/?clientId=123&user=test&mode=active',
        headers: { host: 'localhost' },
      }
      const params = getRequestParams(req as IncomingMessage)
      expect(params.get('clientId')).toBe('123')
      expect(params.get('user')).toBe('test')
      expect(params.get('mode')).toBe('active')
    })
  })
})
