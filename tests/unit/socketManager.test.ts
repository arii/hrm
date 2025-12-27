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
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
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
import logger from '@/utils/logger'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { HrmDataRepository } from '@/lib/repositories/HrmDataRepository'

// Mock dependencies
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

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

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

jest.mock('../../lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

// Mock HrmDataRepository with a stateful, self-contained implementation
jest.mock('../../lib/repositories/HrmDataRepository', () => {
  const mockRepositoryStore = new Map<string, HrmData>()
  const mockInstance = {
    findById: jest.fn((clientId: string) => mockRepositoryStore.get(clientId)),
    save: jest.fn((data: HrmData) => {
      const existingData = mockRepositoryStore.get(data.clientId) || {
        totalCalories: 0,
        hrSamples: [],
      }
      mockRepositoryStore.set(data.clientId, { ...existingData, ...data })
    }),
    clear: jest.fn(() => mockRepositoryStore.clear()),
    deleteById: jest.fn((clientId: string) =>
      mockRepositoryStore.delete(clientId)
    ),
    findAll: jest.fn(() => Array.from(mockRepositoryStore.values())),
  }
  return {
    HrmDataRepository: jest.fn().mockImplementation(() => mockInstance),
  }
})

class MockWebSocket extends EventEmitter {
  isAlive: boolean
  clientType: string | undefined
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()

  constructor() {
    super()
    this.isAlive = true
  }

  receivePong() {
    this.emit('pong')
  }

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
  let hrmDataRepository: jest.Mocked<InstanceType<typeof HrmDataRepository>>

  beforeEach(() => {
    jest.useFakeTimers()
    hrmDataRepository = new HrmDataRepository() as jest.Mocked<
      InstanceType<typeof HrmDataRepository>
    >
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

    mockWs = new MockWebSocket() as ExtWebSocket
    mockWs.clientId = 'user-123'
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
    mockWss.emit('connection', mockWs)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    hrmDataRepository.clear() // Clear the state of our singleton mock
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
      mockWss.emit('connection', newWs)
      expect(newWs.isAlive).toBe(true)
    })

    it('should set isAlive to true on pong', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      mockWss.emit('connection', newWs)
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
  })

  describe('Calorie Calculation', () => {
    beforeEach(() => {
      ;(estimateCaloriesBurned as jest.Mock).mockClear()
    })

    const sendHrmInput = (hr: number) => {
      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: hr },
      })
      mockWs.emit('message', message.toString())
    }

    it('should calculate and accumulate calories periodically', () => {
      // First interval
      ;(estimateCaloriesBurned as jest.Mock).mockReturnValue(3.6)
      sendHrmInput(150)
      jest.advanceTimersByTime(15000)

      const mockBroadcast = broadcast as jest.Mock
      let lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      let payload: HrmData[] = lastCall[1].payload
      let clientData = payload.find((c) => c.clientId === mockWs.clientId)

      expect(clientData).toBeDefined()
      expect(clientData!.totalCalories).toBeCloseTo(3.6, 1)

      // Second interval
      ;(estimateCaloriesBurned as jest.Mock).mockReturnValue(4.1)
      sendHrmInput(160)
      jest.advanceTimersByTime(15000)

      lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      payload = lastCall[1].payload
      clientData = payload.find((c) => c.clientId === mockWs.clientId)

      expect(clientData).toBeDefined()
      // Should be 3.6 + 4.1
      expect(clientData!.totalCalories).toBeCloseTo(7.7, 1)
    })

    it('should handle errors in calorie estimation without crashing', () => {
      ;(estimateCaloriesBurned as jest.Mock).mockImplementation(() => {
        throw new Error('Test estimation error')
      })

      sendHrmInput(150)
      jest.advanceTimersByTime(15000)

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: mockWs.clientId,
        }),
        'Failed to estimate calories burned'
      )

      // Calorie count should be 0
      let clientData = hrmDataRepository.findById(mockWs.clientId)
      expect(clientData).toBeDefined()
      expect(clientData!.totalCalories).toBe(0)

      // Now, let's have a successful estimation
      ;(estimateCaloriesBurned as jest.Mock).mockReturnValue(2.5)
      sendHrmInput(160) // Send another HR input to update state
      jest.advanceTimersByTime(15000)

      // Check the final broadcast state
      const mockBroadcast = broadcast as jest.Mock
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const payload: HrmData[] = lastCall[1].payload
      clientData = payload.find((c) => c.clientId === mockWs.clientId)
      expect(clientData).toBeDefined()
      expect(clientData!.totalCalories).toBe(2.5) // Should now have the new value, not accumulated
    })

    it('should use user-specific weight for calorie calculation', () => {
      hrmDataRepository.save({
        clientId: mockWs.clientId,
        weightKg: 85,
        totalCalories: 0,
      })

      sendHrmInput(150)
      jest.advanceTimersByTime(15000)

      expect(estimateCaloriesBurned).toHaveBeenCalledWith(
        expect.objectContaining({
          weightKg: 85,
        })
      )
    })

    it('should save final accumulated calories on disconnect', () => {
      // First interval accumulates 3.6 calories
      ;(estimateCaloriesBurned as jest.Mock).mockReturnValue(3.6)
      sendHrmInput(150)
      jest.advanceTimersByTime(15000)

      // Partial interval accumulates 1.8 calories
      ;(estimateCaloriesBurned as jest.Mock).mockReturnValue(1.8)
      sendHrmInput(155)
      jest.advanceTimersByTime(7500) // Partial interval
      mockWs.emit('close')

      const saveCalls = (hrmDataRepository.save as jest.Mock).mock.calls
      const finalSaveCall = saveCalls[saveCalls.length - 1][0]

      // The final saved value should be the accumulated total: 3.6 + 1.8
      expect(finalSaveCall.totalCalories).toBeCloseTo(5.4)

      // Verify the user was deleted after the final save
      expect(hrmDataRepository.deleteById).toHaveBeenCalledWith(mockWs.clientId)
      const saveCallOrder = (hrmDataRepository.save as jest.Mock)
        .mock.invocationCallOrder[saveCalls.length - 1]
      const deleteCallOrder = (
        hrmDataRepository.deleteById as jest.Mock
      ).mock.invocationCallOrder[0]
      expect(saveCallOrder).toBeLessThan(deleteCallOrder)
    })
  })

  describe('Message Handling', () => {
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
      hrmDataRepository.save({
        clientId: mockWs.clientId,
        weightKg: 75,
        totalCalories: 5,
      })

      mockWs.emit('close')

      expect(hrmDataRepository.deleteById).toHaveBeenCalledWith(
        mockWs.clientId
      )
      expect(hrmDataRepository.findAll()).toEqual([])

      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      expect(lastBroadcastCall[1]).toEqual({
        type: 'HRM_UPDATE',
        payload: [],
      })
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
})
