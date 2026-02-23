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
    } as any)

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
  })

  describe('Connection Monitoring', () => {
    it('should initialize and start the ConnectionMonitor', () => {
      expect(ConnectionMonitor).toHaveBeenCalledWith(mockWss)
      const monitorInstance = (ConnectionMonitor as jest.Mock).mock.results[0]
        .value
      expect(monitorInstance.start).toHaveBeenCalled()
    })

    it('should stop the ConnectionMonitor when the server closes', () => {
      mockWss.emit('close')
      const monitorInstance = (ConnectionMonitor as jest.Mock).mock.results[0]
        .value
      expect(monitorInstance.stop).toHaveBeenCalled()
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
      const updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      expect(updateCalls.length).toBeGreaterThan(0)
      const lastCall = updateCalls[updateCalls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
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

      const mockBroadcast = broadcast as jest.Mock
      let updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
      let clientData = finalPayload.find((c) => c.clientId === 'test-client')
      expect(clientData!.calories).toBe(10)

      // Now, send a message with a huge jump
      const anomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 151, calories: 100 }, // A jump of 90 calories
      })
      mockWs.emit('message', anomalyMessage.toString())

      updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload
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
      // Send an initial message with a calorie value that exceeds the MAX_CALORIE_JUMP_PER_UPDATE threshold.
      const initialAnomalyMessage = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 120, calories: 1001 }, // 1001 > MAX_INITIAL_CALORIES (1000)
      })
      mockWs.emit('message', initialAnomalyMessage.toString())

      const mockBroadcast = broadcast as jest.Mock
      const updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      const lastCall = updateCalls[updateCalls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.clientId === 'test-client')

      // The server should have rejected the anomalously high initial value and kept calories at 0.
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
      // Calories should remain at the last known safe value (which is 0 initially).
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

      const mockBroadcast = broadcast as jest.Mock
      let updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
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

      updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      // The server should now accept the new, reasonable value.
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

      const mockBroadcast = broadcast as jest.Mock
      let updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      let lastCall = updateCalls[updateCalls.length - 1]
      let finalPayload: HrmData[] = lastCall[1].payload
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

      updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      lastCall = updateCalls[updateCalls.length - 1]
      finalPayload = lastCall[1].payload
      clientData = finalPayload.find((c) => c.clientId === 'test-client')

      // The calorie value should remain unchanged from the last known value.
      expect(clientData!.calories).toBe(25)
      // The HR value should be updated.
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
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.type).toBe('INITIAL_STATE')
      expect(sentData.payload).toHaveProperty('timerData')
      expect(sentData.payload).toHaveProperty('spotifyData')
      expect(sentData.payload).toHaveProperty('hrmData')
    })

    it('should broadcast state on client disconnect', () => {
      mockWs.emit('close')
      jest.runOnlyPendingTimers()

      // We expect DEVICE_OFFLINE followed by HRM_UPDATE (from cleanupClientSession)
      expect(broadcast).toHaveBeenCalledWith(
        mockWss,
        expect.objectContaining({
          type: 'DEVICE_OFFLINE',
          payload: { deviceId: 'test-client' },
        }),
        'socketManager.cleanupClientSession'
      )
    })
  })
  describe('Session Cleanup', () => {
    it('should clean up client session after grace period', () => {
      const clientId = 'test-client-cleanup'
      const mockReq = createMockRequest(`/?clientId=${clientId}`)
      const newWs = new MockWebSocket()
      mockWss.emit('connection', newWs, mockReq)

      // Ensure the client has a name so it passes the server-side filter
      newWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Cleanup Athlete' },
        })
      )

      // Disconnect the client
      newWs.emit('close')

      // Advance timers to trigger cleanup
      jest.runOnlyPendingTimers()

      // Ensure test-client is still active and has a fresh timestamp
      mockWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Test Athlete' },
        })
      )

      // Verify that the cleanup logic was called
      expect(logger.info).toHaveBeenCalledWith(
        { clientId },
        'Session expired. Deleting data.'
      )

      // Verify the broadcast payload contains the other client but not the cleaned-up one
      const mockBroadcast = broadcast as jest.Mock
      const updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      const lastCall = updateCalls[updateCalls.length - 1]
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

      // Ensure the client has a name so it passes the server-side filter
      firstWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Reconnect Athlete' },
        })
      )

      // Disconnect the first client
      firstWs.emit('close')

      // Reconnect with a new WebSocket instance before the timer fires
      const secondWs = new MockWebSocket()
      mockWss.emit('connection', secondWs, mockReq)

      // Advance timers past the grace period
      jest.runOnlyPendingTimers()

      // Ensure reconnected client is still active and has a fresh timestamp
      secondWs.emit(
        'message',
        JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Reconnect Athlete' },
        })
      )

      // Verify that the cleanup was NOT called for the original session
      expect(logger.info).not.toHaveBeenCalledWith(
        { clientId },
        'Session expired. Deleting data.'
      )
      // Verify that the "timer cleared" message was logged
      expect(logger.info).toHaveBeenCalledWith(
        { clientId },
        'Cleared cleanup timer for reconnected client.'
      )

      // Trigger a broadcast by having the other client disconnect
      mockWs.emit('close') // This is the 'test-client' from beforeEach
      jest.runOnlyPendingTimers()

      // Verify that the client's data still exists in the broadcast from the *other* client's cleanup
      const mockBroadcast = broadcast as jest.Mock
      const updateCalls = mockBroadcast.mock.calls.filter(call => call[1].type === 'HRM_UPDATE')
      const lastCall = updateCalls[updateCalls.length - 1]
      const payload: HrmData[] = lastCall[1].payload

      // The payload should contain our reconnected client
      expect(payload.find((c) => c.clientId === clientId)).toBeDefined()
      // The payload should NOT contain the client that just disconnected to trigger the broadcast
      expect(payload.find((c) => c.clientId === 'test-client')).toBeUndefined()
    })
  })
})
