// Mocks must be at the top to be hoisted by Jest
const mockTabataInstance = {
  getState: jest.fn(),
  handleCommand: jest.fn(),
  setMode: jest.fn(),
  setConfig: jest.fn(),
}
const mockSpotifyInstance = {
  getState: jest.fn(),
  handleCommand: jest.fn(),
}

jest.mock('../../services/tabataTimer', () => ({
  TabataTimer: jest.fn().mockImplementation(() => mockTabataInstance),
}))
jest.mock('../../services/spotifyPolling', () => ({
  SpotifyPolling: jest.fn().mockImplementation(() => mockSpotifyInstance),
}))
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
    const EventEmitter = require('events')
    const wss = new EventEmitter()
    wss.clients = new Set()
    const originalOn = wss.on.bind(wss)
    const originalEmit = wss.emit.bind(wss)
    wss.on = jest.fn((event, listener) => originalOn(event, listener))
    wss.emit = jest.fn((event, ...args) => originalEmit(event, ...args))
    return wss
  }),
  WebSocket: jest.fn(),
}))

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
import { initSocketManager, resetSocketManager } from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import {
  HrmData,
  ClientCommandMessageSchema,
  ExtWebSocket,
} from '../../types/websocket'
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from '../../utils/websocketUtils.js'
import logger from '@/utils/logger'
import { TabataTimer } from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'

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
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.useFakeTimers()

    // Clear mocks on the constructors and instance methods
    ;(TabataTimer as jest.Mock).mockClear()
    ;(SpotifyPolling as jest.Mock).mockClear()
    Object.values(mockTabataInstance).forEach((mockFn) => mockFn.mockClear())
    Object.values(mockSpotifyInstance).forEach((mockFn) => mockFn.mockClear())

    // Provide default return values to prevent crashes in `getUnifiedStateSnapshot`
    mockTabataInstance.getState.mockReturnValue({ phase: 'IDLE' })
    mockSpotifyInstance.getState.mockReturnValue({ isPlaying: false })

    mockWss =
      new (WebSocketServer as jest.Mock)() as jest.Mocked<WebSocketServer>

    initSocketManager(mockWss)

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

  describe('Connection Handling', () => {
    it('should send INITIAL_STATE on new connection', () => {
      expect(sendWebSocketMessage).toHaveBeenCalledWith(
        mockWs,
        expect.objectContaining({ type: 'INITIAL_STATE' }),
        'socketManager.onConnection'
      )
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.payload).toHaveProperty('timer')
      expect(sentData.payload).toHaveProperty('spotify')
      expect(sentData.payload).toHaveProperty('hrmData')
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
      mockWss.emit('connection', newWs)
      expect(newWs.isAlive).toBe(true)
    })

    it('should set isAlive to true on pong', () => {
      const newWs = new MockWebSocket() as ExtWebSocket
      mockWss.emit('connection', newWs)
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
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: hr, age: 30 },
        })
        mockWs.emit('message', message.toString())
      }

      // Initial input
      sendHrmInput(150)

      // Send 100 updates, each 100ms apart
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(100) // 100ms
        sendHrmInput(150)
      }

      const mockBroadcast = broadcast as jest.Mock
      jest.runOnlyPendingTimers()
      expect(mockBroadcast).toHaveBeenCalled()
      const lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const finalPayload: HrmData[] = lastCall[1].payload
      const clientData = finalPayload.find((c) => c.calories > 0)

      expect(clientData).toBeDefined()
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
