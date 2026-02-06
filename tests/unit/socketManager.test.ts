/**
 * @jest-environment node
 */
import {
  afterAll,
  afterEach,
  beforeAll,
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
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { TLSSocket } from 'tls'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import {
  HrmData,
  StateSnapshot,
  ClientCommandMessageSchema,
  ExtWebSocket,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger.server'
import { createMockRequest } from '@/tests/test-utils'

jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(),
  ConnectionMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

jest.mock('../../utils/logger.server.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Simplified MockWebSocket
class MockWebSocket extends EventEmitter {
  isAlive = true
  clientType?: 'dashboard' | 'controller'
  clientId = '' // Initialize as required by ExtWebSocket
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  close = jest.fn()
  readyState = 1 // WebSocket.OPEN

  // Add missing WebSocket properties to satisfy ExtWebSocket interface partially
  binaryType = 'blob'
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  url = ''
  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3
  onopen = null
  onclose = null
  onerror = null
  onmessage = null
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  dispatchEvent = jest.fn()
}

jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as unknown as WebSocketServer
    // Correctly type clients as Set<ExtWebSocket> to avoid casts in tests
    wss.clients = new Set<ExtWebSocket>() as unknown as Set<
      import('ws').WebSocket
    >
    // Spy on methods instead of manual wrapping
    jest.spyOn(wss, 'on')
    jest.spyOn(wss, 'emit')
    return wss
  }),
  WebSocket: Object.assign(jest.fn(), {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }),
}))

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
    const mockReq = createMockRequest()
    mockWs = new MockWebSocket()
    // Type assertion removed as MockWebSocket now conforms to ExtWebSocket
    ;(mockWss.clients as unknown as Set<ExtWebSocket>).add(
      mockWs as ExtWebSocket
    )
    mockWss.emit('connection', mockWs, mockReq)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as unknown as Set<ExtWebSocket>).clear()
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
      const mockReq = createMockRequest('/?clientId=test-client')
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

    describe('Production Redaction', () => {
      let originalNodeEnv: string | undefined

      beforeAll(() => {
        originalNodeEnv = process.env.NODE_ENV
      })

      afterAll(() => {
        process.env.NODE_ENV = originalNodeEnv
      })

      it('should redact sensitive fields in production', async () => {
        process.env.NODE_ENV = 'production'
        process.env.NEXTAUTH_SECRET =
          'a-very-long-and-secure-secret-for-production-env'

        const loggerInfoSpy = jest.spyOn(logger, 'info')
        const mockReq = createMockRequest('/?clientId=prod-client')
        const newWs = new MockWebSocket()

        await jest.isolateModulesAsync(async () => {
          const { initSocketManager: initSocketManagerProd } =
            await import('../../utils/socketManager')

          initSocketManagerProd(mockWss, getSnapshot, mockServices)
          mockWss.emit('connection', newWs, mockReq)

          expect(loggerInfoSpy).toHaveBeenCalledWith(
            {
              clientId: 'prod-client',
              ip: '[REDACTED]',
              isSecure: false,
              origin: '[REDACTED]',
              userAgent: '[REDACTED]',
              host: 'localhost:3000',
            },
            'WebSocket client connected'
          )
        })
      })
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
      newWs.isAlive = false
      newWs.emit('pong')
      expect(newWs.isAlive).toBe(true)
    })

    it('should stop the ConnectionMonitor when the server closes', () => {
      mockWss.emit('close')
      const monitorInstance = (ConnectionMonitor as jest.Mock).mock.results[0]
        .value
      expect(monitorInstance.stop).toHaveBeenCalled()
    })

    it('should set isAlive to true on any message', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      const mockReq = createMockRequest()
      mockWss.emit('connection', newWs, mockReq)
      newWs.isAlive = false
      const message = JSON.stringify({ type: 'PING' })
      newWs.emit('message', message.toString())
      expect(newWs.isAlive).toBe(true)
    })
  })

  describe('Calorie Processing', () => {
    it('should accept and store client-calculated calories', () => {
      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150, calories: 123.45 },
      })
      mockWs.emit('message', message.toString())

      const mockBroadcast = broadcast as jest.Mock
      expect(mockBroadcast).toHaveBeenCalled()
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(clientData).toBeDefined()
      expect(clientData!.calories).toBe(123.45)
    })

    it('should ignore a large, anomalous calorie jump from the client', () => {
      const baselineMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150, calories: 10 },
      })
      mockWs.emit('message', baselineMessage.toString())

      let mockBroadcast = broadcast as jest.Mock
      let lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(10)

      const anomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 151, calories: 100 },
      })
      mockWs.emit('message', anomalyMessage.toString())

      mockBroadcast = broadcast as jest.Mock
      lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      finalPayload = lastCall[1].payload
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client',
          clientCalories: 100,
          serverCalories: 10,
        }),
        'Anomalous calorie value detected. Using last known server value.'
      )
      expect(clientData!.calories).toBe(10)
    })

    it('should reject an anomalously high initial calorie value', () => {
      const initialAnomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, calories: 1001 },
      })
      mockWs.emit('message', initialAnomalyMessage.toString())

      const mockBroadcast = broadcast as jest.Mock
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client',
          clientCalories: 1001,
          serverCalories: 0,
          isInitialValue: true,
        }),
        'Anomalous calorie value detected. Using last known server value.'
      )
      expect(clientData).toBeDefined()
      expect(clientData!.calories).toBe(0)
    })

    it('should accept a subsequent valid calorie update after an anomaly', () => {
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, calories: 10 },
        })
      )

      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 151, calories: 100 },
        })
      )

      const mockBroadcast = broadcast as jest.Mock
      let lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(10)

      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 152, calories: 11.5 },
        })
      )

      lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      finalPayload = lastCall[1].payload
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(clientData!.calories).toBe(11.5)
    })

    it('should handle HRM_INPUT messages without a calories field gracefully', () => {
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, calories: 25 },
        })
      )

      const mockBroadcast = broadcast as jest.Mock
      let lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(25)

      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 155 },
        })
      )

      lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      finalPayload = lastCall[1].payload
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(clientData!.calories).toBe(25)
      expect(clientData!.value).toBe(155)
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
      expect(sentData.payload).toHaveProperty('timer')
      expect(sentData.payload).toHaveProperty('spotify')
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

    it('should forward SPOTIFY_COMMAND to dashboard clients', () => {
      const dashboardWs = new MockWebSocket() as ExtWebSocket
      dashboardWs.clientType = 'dashboard'
      const controllerWs = new MockWebSocket() as ExtWebSocket
      controllerWs.clientType = 'controller'
      ;(mockWss.clients as unknown as Set<ExtWebSocket>).add(dashboardWs)
      ;(mockWss.clients as unknown as Set<ExtWebSocket>).add(controllerWs)

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
      jest
        .spyOn(ClientCommandMessageSchema, 'parse')
        .mockReturnValue({ type: 'SOME_GARBAGE' } as unknown)

      mockWs.emit('message', message.toString())

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'Unknown message type received'
      )
    })
  })
  describe('Session Cleanup', () => {
    it('should clean up client session after grace period', () => {
      const clientId = 'test-client-cleanup'
      const mockReq = createMockRequest(`/?clientId=${clientId}`)
      const newWs = new MockWebSocket()
      mockWss.emit('connection', newWs, mockReq)

      newWs.emit('close')

      jest.runOnlyPendingTimers()

      expect(logger.info).toHaveBeenCalledWith(
        { clientId },
        'Session expired. Deleting data.'
      )

      const mockBroadcast = broadcast as jest.Mock
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const payload: HrmData[] = lastCall[1].payload

      expect(payload.length).toBe(1)
      expect(payload[0].clientId).toBe('test-client')
      expect(payload.find((c) => c.clientId === clientId)).toBeUndefined()
    })

    it('should not clean up session if client reconnects within grace period', () => {
      const clientId = 'test-client-reconnect'
      const mockReq = createMockRequest(`/?clientId=${clientId}`)
      const firstWs = new MockWebSocket()
      mockWss.emit('connection', firstWs, mockReq)

      firstWs.emit('close')

      const secondWs = new MockWebSocket()
      mockWss.emit('connection', secondWs, mockReq)

      jest.runOnlyPendingTimers()

      expect(logger.info).not.toHaveBeenCalledWith(
        { clientId },
        'Session expired. Deleting data.'
      )
      expect(logger.info).toHaveBeenCalledWith(
        { clientId },
        'Cleared cleanup timer for reconnected client.'
      )

      mockWs.emit('close')
      jest.runOnlyPendingTimers()

      const mockBroadcast = broadcast as jest.Mock
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const payload: HrmData[] = lastCall[1].payload

      expect(payload.find((c) => c.clientId === clientId)).toBeDefined()
      expect(payload.find((c) => c.clientId === 'test-client')).toBeUndefined()
    })
  })
})
