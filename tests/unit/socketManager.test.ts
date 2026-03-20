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
  ServerMessage,
  ClientCommandMessage,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger.server'
import { createMockRequest } from '@/tests/test-utils'

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
jest.mock('../../utils/logger.server.js', () => ({
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
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'))
    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>

    // Create fully typed mocks for the services.
    const mockTabataTimer: jest.Mocked<TabataTimer> = {
      start: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      setMode: jest.fn(),
      setConfig: jest.fn(),
      getState: jest.fn(),
      dispose: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<TabataTimer>

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
      timerData: {},
      spotifyData: {},
    } as unknown as StateSnapshot)

    initSocketManager(mockWss, getSnapshot, mockServices)
    const mockReq = createMockRequest()
    mockWs = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
    mockWss.emit('connection', mockWs, mockReq)

    // Ensure the client has a non-generic name so it passes the server-side filter
    mockWs.emit(
      'message',
      JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { name: 'Test Athlete' },
      })
    )
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
        expect.objectContaining({
          clientId: 'new-client-123',
        }),
        'WebSocket client connected'
      )
    })

    it('should log a warning when overwriting an existing socket', () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn')
      const mockReq = createMockRequest('/?clientId=test-client') // Same clientId as in beforeEach
      const newWs = new MockWebSocket()

      mockWss.emit('connection', newWs, mockReq)

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client',
        }),
        'Existing socket found. Overwriting with new connection.'
      )
    })

    it('should correctly identify a secure TLSSocket connection', () => {
      const loggerInfoSpy = jest.spyOn(logger, 'info')
      // Simulate a TLSSocket by creating an object with the correct prototype chain
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

        // Re-import the module to get the version with the updated process.env
        await jest.isolateModulesAsync(async () => {
          const { initSocketManager: initSocketManagerProd } =
            await import('../../utils/socketManager')

          // Use the re-imported init function
          initSocketManagerProd(mockWss, getSnapshot, mockServices)
          mockWss.emit('connection', newWs, mockReq)

          expect(loggerInfoSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              clientId: 'prod-client',
              ip: '[REDACTED]',
            }),
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
        .value as { start: jest.Mock }
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
        .value as { stop: jest.Mock }
      expect(monitorInstance.stop).toHaveBeenCalled()
    })

    it('should set isAlive to true on any message', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      const mockReq = createMockRequest()
      mockWss.emit('connection', newWs, mockReq)
      newWs.isAlive = false // Manually set to false
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

      const mockBroadcast = broadcast as jest.MockedFunction<typeof broadcast>
      const updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      expect(updateCalls.length).toBeGreaterThan(0)
      const lastCall = updateCalls[updateCalls.length - 1]
      const finalPayload = lastCall[1].payload as HrmData[]
      const clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(clientData).toBeDefined()
      expect(clientData!.calories).toBe(123.45)
    })

    it('should ignore a large, anomalous calorie jump from the client', () => {
      // First, set a reasonable baseline
      const baselineMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150, calories: 10 },
      })
      mockWs.emit('message', baselineMessage.toString())

      const mockBroadcast = broadcast as jest.MockedFunction<typeof broadcast>
      let updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload = lastCall[1].payload as HrmData[]
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(10)

      // Now, send a message with a huge jump
      const anomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 151, calories: 100 }, // A jump of 90 calories
      })
      mockWs.emit('message', anomalyMessage.toString())

      updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload as HrmData[]
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      // The server should have rejected the new value and kept the old one.
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
      // Server's initial calorie state for a new client is 0.
      const initialAnomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, calories: 1001 }, // 1001 > MAX_INITIAL_CALORIES (1000)
      })
      mockWs.emit('message', initialAnomalyMessage.toString())

      const mockBroadcast = broadcast as jest.MockedFunction<typeof broadcast>
      const updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      const lastCall = updateCalls[updateCalls.length - 1]
      const finalPayload = lastCall[1].payload as HrmData[]
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
      // 1. Baseline
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, calories: 10 },
        })
      )

      // 2. Anomaly (rejected)
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 151, calories: 100 },
        })
      )

      const mockBroadcast = broadcast as jest.MockedFunction<typeof broadcast>
      let updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload = lastCall[1].payload as HrmData[]
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(10) // Still at 10

      // 3. Valid update
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 152, calories: 11.5 },
        })
      )

      updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload as HrmData[]
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      expect(clientData!.calories).toBe(11.5)
    })

    it('should handle HRM_INPUT messages without a calories field gracefully', () => {
      // Set a known calorie value first
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, calories: 25 },
        })
      )

      const mockBroadcast = broadcast as jest.MockedFunction<typeof broadcast>
      let updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload = lastCall[1].payload as HrmData[]
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(25)

      // Send a message without the calories field (like an old client would)
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 155 },
        })
      )

      updateCalls = mockBroadcast.mock.calls.filter(
        (call) => call[1].type === 'HRM_UPDATE'
      )
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload as HrmData[]
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

    it('should handle TIMER_COMMAND START message', () => {
      const message = JSON.stringify({
        type: 'TIMER_COMMAND',
        command: 'START',
      })
      mockWs.emit('message', message.toString())
      expect(mockServices.tabataService.start).toHaveBeenCalled()
    })

    it('should handle TIMER_COMMAND PAUSE message', () => {
      const message = JSON.stringify({
        type: 'TIMER_COMMAND',
        command: 'PAUSE',
      })
      mockWs.emit('message', message.toString())
      expect(mockServices.tabataService.pause).toHaveBeenCalled()
    })

    it('should handle TIMER_COMMAND STOP message', () => {
      const message = JSON.stringify({
        type: 'TIMER_COMMAND',
        command: 'STOP',
      })
      mockWs.emit('message', message.toString())
      expect(mockServices.tabataService.stop).toHaveBeenCalled()
    })

    it('should send initial state on GET_STATE message', () => {
      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message.toString())

      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
      const sentData = (
        sendWebSocketMessage as jest.MockedFunction<typeof sendWebSocketMessage>
      ).mock.calls[0][1] as ServerMessage
      expect(sentData.type).toBe('INITIAL_STATE')
      if (sentData.type === 'INITIAL_STATE') {
        expect(sentData.payload).toHaveProperty('timerData')
        expect(sentData.payload).toHaveProperty('spotifyData')
        expect(sentData.payload).toHaveProperty('hrmData')
      }
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
        expect.objectContaining({
          type: 'HRM_UPDATE',
        }),
        'socketManager.broadcastState'
      )
    })

    it('should call spotifyService.handleCommand and NOT forward to dashboard clients', () => {
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
      jest.spyOn(ClientCommandMessageSchema, 'parse').mockReturnValue({
        type: 'SOME_GARBAGE',
      } as unknown as ClientCommandMessage)

      mockWs.emit('message', message.toString())

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'Unknown message type received'
      )
    })
  })
})
