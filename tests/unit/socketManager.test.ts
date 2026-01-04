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
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'
import { Server as WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { TLSSocket } from 'tls'
import {
  StateSnapshot,
  ClientCommandMessageSchema,
  ExtWebSocket,
  HrmData,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger'
import { createMockRequest } from './test-data/request-data-factory'
import { AppServices } from '@/lib/services'
import TabataTimer from '@/services/tabataTimer'
import { SpotifyPolling } from '@/services/spotifyPolling'

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
  clientId?: string
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  readyState = WebSocket.OPEN

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
  let mockServices: jest.Mocked<AppServices>
  let getSnapshot: () => StateSnapshot
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>

    // Create fully typed mocks for the services.
    const mockTabataTimer = {
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
      getSnapshot: jest.fn().mockReturnValue({
        // Mock the return value of getSnapshot
        phase: 'idle',
        remainingTime: 0,
        workDuration: 0,
        restDuration: 0,
        totalRounds: 0,
        currentRound: 0,
      }),
      cleanup: jest.fn(),
    } as unknown as jest.Mocked<TabataTimer>

    const mockSpotifyPolling = {
      handleCommand: jest.fn(),
      forcePollAndBroadcast: jest.fn(),
      getState: jest.fn(),
      isReady: jest.fn(),
      handleTokenUpdate: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      cleanup: jest.fn(),
      refreshDevices: jest.fn(),
      getSnapshot: jest.fn().mockReturnValue({
        // Mock the return value of getSnapshot
        isPlaying: false,
        track: null,
        artist: null,
        album: null,
        albumArtUrl: null,
        progressMs: 0,
        durationMs: 0,
        devices: [],
        volume: 0,
        isAuthorized: false,
      }),
    } as unknown as jest.Mocked<SpotifyPolling>

    mockServices = {
      tabataService: mockTabataTimer,
      spotifyService: mockSpotifyPolling,
    } as jest.Mocked<AppServices>

    getSnapshot = jest.fn().mockReturnValue({
      timerData: mockServices.tabataService.getSnapshot(),
      spotifyData: mockServices.spotifyService.getSnapshot(),
    })

    initSocketManager(mockWss, getSnapshot, mockServices)
    const mockReq = createMockRequest()
    mockWs = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
    mockWss.emit('connection', mockWs, mockReq)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    resetSocketManager()
  })
  describe('Connection Logging', () => {
    it('should log connection metadata on new connection', () => {
      const loggerInfoSpy = jest.spyOn(logger, 'info')
      const mockReq = createMockRequest('/?clientId=new-client-123')
      const newWs = new MockWebSocket()
      mockWss.emit('connection', newWs, mockReq)
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        {
          clientId: 'new-client-123',
          ip: '127.0.0.1',
          isSecure: false,
          origin: 'http://localhost:3000',
          userAgent: 'jest-test',
          host: 'localhost:3000',
        },
        'WebSocket client connected'
      )
    })
    it('should log a warning when overwriting an existing socket', () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn')
      const mockReq = createMockRequest('/?clientId=test-client') // Same clientId as in beforeEach
      const newWs = new MockWebSocket()
      mockWss.emit('connection', newWs, mockReq)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          clientId: 'test-client',
          ip: '127.0.0.1',
          isSecure: false,
          origin: 'http://localhost:3000',
          userAgent: 'jest-test',
          host: 'localhost:3000',
        },
        'Existing socket found. Overwriting with new connection.'
      )
    })
    it('should correctly identify a secure TLSSocket connection', () => {
      const loggerInfoSpy = jest.spyOn(logger, 'info')
      const mockTlsSocket = Object.create(TLSSocket.prototype)
      const mockReq = createMockRequest(
        '/?clientId=secure-client',
        {},
        mockTlsSocket
      )
      const newWs = new MockWebSocket()
      mockWss.emit('connection', newWs, mockReq)
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'secure-client',
          isSecure: true,
        }),
        'WebSocket client connected'
      )
    })
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
      const mockReq = createMockRequest()
      mockWss.emit('connection', newWs, mockReq)
      expect(newWs.isAlive).toBe(true)
    })
    it('should set isAlive to true on pong', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      const mockReq = createMockRequest()
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
      const sendHrmInput = (hr: number) => {
        const message = {
          type: 'HRM_INPUT',
          data: { value: hr, age: 30, source: 'mock' },
        }
        mockWs.emit('message', JSON.stringify(message))
      }
      sendHrmInput(150)
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(100)
        sendHrmInput(150)
      }
      jest.runOnlyPendingTimers()
      const mockBroadcast = broadcast as jest.Mock
      expect(mockBroadcast).toHaveBeenCalled()
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.calories > 0)
      expect(clientData).toBeDefined()
      expect(clientData!.calories).toBeGreaterThan(0.1)
      expect(clientData!.calories).toBeGreaterThan(1)
    })
  })
  describe('Message Handling', () => {
    it('should handle REGISTER_CLIENT message', () => {
      const message = JSON.stringify({
        type: 'REGISTER_CLIENT',
        role: 'dashboard',
      })
      mockWs.emit('message', message.toString())
      expect((mockWs as ExtWebSocket).clientType).toBe('dashboard')
    })
    it('should send initial state on GET_STATE message', () => {
      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message.toString())
      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.type).toBe('INITIAL_STATE')
      expect(sentData.payload).toHaveProperty('timerData')
      expect(sentData.payload).toHaveProperty('spotifyData')
      expect(sentData.payload).toHaveProperty('hrmData')
    })
    it('should handle invalid JSON gracefully', () => {
      mockWs.emit('message', 'invalid json')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'Error processing incoming message'
      )
    })
    it('should handle Zod validation errors gracefully', () => {
      const message = JSON.stringify({ type: 'INVALID_TYPE' })
      mockWs.emit('message', message.toString())
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'WebSocket message validation failed'
      )
    })
    it('should broadcast state on client disconnect', () => {
      mockWs.emit('close')
      jest.runAllTimers()
      expect(broadcast).toHaveBeenCalledWith(
        mockWss,
        {
          type: 'HRM_UPDATE',
          payload: [],
        },
        'socketManager.broadcastState'
      )
    })
    it('should forward SPOTIFY_COMMAND to dashboard clients', () => {
      const dashboardWs = new MockWebSocket() as ExtWebSocket
      dashboardWs.clientType = 'dashboard'
      const controllerWs = new MockWebSocket() as ExtWebSocket
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
        {}
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
    it('should extract uri from SPOTIFY_COMMAND', () => {
      const message = JSON.stringify({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'test_device',
        uri: 'spotify:track:12345',
      })
      mockWs.emit('message', message.toString())
      expect(mockServices.spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        {
          deviceId: 'test_device',
          uri: 'spotify:track:12345',
        }
      )
    })
    it('should handle unknown message types', () => {
      const message = JSON.stringify({ type: 'SOME_GARBAGE' })
      jest.spyOn(ClientCommandMessageSchema, 'parse').mockImplementation(() => {
        throw new Error('Invalid')
      })
      mockWs.emit('message', message.toString())
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'Error processing incoming message'
      )
    })
  })
  describe('Mock Mode', () => {
    it('should enable and disable mock mode', () => {
      const enableMessage = JSON.stringify({
        type: 'SET_MOCK_MODE',
        enabled: true,
      })
      mockWs.emit('message', enableMessage)
      const hrmMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, source: 'bluetooth' },
      })
      mockWs.emit('message', hrmMessage)
      expect(broadcast).not.toHaveBeenCalled()
      const disableMessage = JSON.stringify({
        type: 'SET_MOCK_MODE',
        enabled: false,
      })
      mockWs.emit('message', disableMessage)
      mockWs.emit('message', hrmMessage)
      jest.runOnlyPendingTimers()
      expect(broadcast).toHaveBeenCalled()
    })
    it('should ignore bluetooth data when mock mode is active', () => {
      const enableMessage = JSON.stringify({
        type: 'SET_MOCK_MODE',
        enabled: true,
      })
      mockWs.emit('message', enableMessage)
      const hrmMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, source: 'bluetooth' },
      })
      mockWs.emit('message', hrmMessage)
      expect(broadcast).not.toHaveBeenCalled()
    })
    it('should process mock data when mock mode is active', () => {
      const enableMessage = JSON.stringify({
        type: 'SET_MOCK_MODE',
        enabled: true,
      })
      mockWs.emit('message', enableMessage)
      const hrmMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 130, source: 'mock' },
      })
      mockWs.emit('message', hrmMessage)
      jest.runOnlyPendingTimers()
      expect(broadcast).toHaveBeenCalled()
      const lastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload: HrmData[] = lastCall[1].payload
      expect(payload[0].value).toBe(130)
    })
    it('should process bluetooth data when mock mode is inactive', () => {
      const hrmMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 140, source: 'bluetooth' },
      })
      mockWs.emit('message', hrmMessage)
      jest.runOnlyPendingTimers()
      expect(broadcast).toHaveBeenCalled()
      const lastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload: HrmData[] = lastCall[1].payload
      expect(payload[0].value).toBe(140)
    })
  })
})
