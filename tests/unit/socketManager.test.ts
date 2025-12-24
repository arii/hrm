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
import { serviceContainer } from '../../lib/serviceContainer.js'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('../../lib/serviceContainer.js')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock broadcaster to prevent side-effects between tests
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
    const wss = new EventEmitter() as unknown as WebSocketServer
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
  isAlive: boolean | undefined
  clientType: string | undefined
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
  let mockWss: WebSocketServer
  let mockServices: {
    tabataService: TabataTimer
    spotifyService: SpotifyPolling
  }
  let getSnapshot: () => StateSnapshot
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss = new (WebSocketServer as jest.Mock)()
    mockServices = {
      tabataService: {
        handleCommand: jest.fn(),
        setMode: jest.fn(),
        setConfig: jest.fn(),
      } as unknown as TabataTimer,
      spotifyService: {
        handleCommand: jest.fn(),
      } as unknown as SpotifyPolling,
    }
    getSnapshot = jest.fn().mockReturnValue({
      timer: {},
      spotify: {},
    })

    const mockedServiceContainer = serviceContainer as jest.Mocked<
      typeof serviceContainer
    >
    mockedServiceContainer.get.mockImplementation(
      (key: 'spotifyService' | 'tabataService') => {
        if (key === 'spotifyService') {
          return mockServices.spotifyService
        }
        if (key === 'tabataService') {
          return mockServices.tabataService
        }
        throw new Error(`Unexpected service key: ${key}`)
      }
    )

    initSocketManager(mockWss, getSnapshot)

    mockWs = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
    mockWss.emit('connection', mockWs)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    resetSocketManager()
  })

  describe('Calorie Calculation', () => {
    it('should accumulate calories correctly with small frequent updates', () => {
      const sendHrmInput = (hr: number) => {
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: hr, age: 30 },
        })
        mockWs.emit('message', message.toString())
      }

      // Initial input
      sendHrmInput(150)

      // Send 100 updates, each 100ms apart
      // Should accumulate significant calories even if each step < 0.1 kcal
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(100) // 100ms
        sendHrmInput(150)
      }

      // Check the last broadcasted state
      const mockBroadcast = broadcast as jest.Mock
      jest.runOnlyPendingTimers()
      expect(mockBroadcast).toHaveBeenCalled()
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.calories > 0)

      expect(clientData).toBeDefined()
      expect(clientData!.calories).toBeGreaterThan(0.1)
      // A more precise check based on the known formula for short duration.
      // 100 updates * 100ms = 10 seconds = 0.1667 minutes.
      // With HR=150, Age=30, Weight=75, the calories should be roughly > 1.
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
