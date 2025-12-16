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
} from '../../types/websocket'
import { broadcast } from '../../utils/broadcast'
import logger from '@/utils/logger'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

// Mock broadcaster to prevent side-effects between tests
jest.mock('../../utils/broadcast', () => ({
  initBroadcaster: jest.fn(),
  broadcast: jest.fn(),
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
  lastPingTime: number | undefined
  clientType: string | undefined
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()

  constructor() {
    super()
    this.lastPingTime = Date.now()
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
  describe('Heartbeat and Watchdog', () => {
    let mockWss: WebSocketServer
    let mockServices: {
      tabataService: TabataTimer
      spotifyService: SpotifyPolling
    }
    let getSnapshot: () => StateSnapshot

    beforeEach(() => {
      jest.useFakeTimers()
      mockWss = new (WebSocketServer as jest.Mock)()
      mockServices = {
        tabataService: {
          handleCommand: jest.fn(),
          setMode: jest.fn(),
        } as unknown as TabataTimer,
        spotifyService: {
          handleCommand: jest.fn(),
        } as unknown as SpotifyPolling,
      }
      getSnapshot = jest.fn()
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      ;(mockWss.clients as Set<MockWebSocket>).clear()
      // Reset module-level state to ensure test isolation
      resetSocketManager()
    })

    it('should set lastPingTime on new connection', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs) // Manually trigger connection event

      expect(mockWs.lastPingTime).toBeDefined()
      expect(mockWs.lastPingTime).toBeLessThanOrEqual(Date.now())
    })

    it('should update lastPingTime on PING message and respond with PONG', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

      const initialPingTime = mockWs.lastPingTime
      jest.advanceTimersByTime(1000)

      // Simulate a PING message from the client
      const message = JSON.stringify({ type: 'PING' })
      mockWs.emit('message', message.toString())

      expect(mockWs.lastPingTime).toBeGreaterThan(initialPingTime!)
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }))
    })

    it('should terminate a client if no ping is received within the timeout', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

      // Do NOT simulate a ping. Advance time past the client inactivity timeout (120s)
      // and the watchdog interval (30s) to ensure the check that terminates runs.
      jest.advanceTimersByTime(150000)

      expect(mockWs.terminate).toHaveBeenCalledTimes(1)
    })

    it('should NOT terminate a client that is responsive', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

      // Simulate responsiveness by sending pings
      const interval = setInterval(() => {
        const message = JSON.stringify({ type: 'PING' })
        mockWs.emit('message', message.toString())
      }, 25000) // Send a ping every 25 seconds

      jest.advanceTimersByTime(150000) // Advance well past the timeout

      expect(mockWs.terminate).not.toHaveBeenCalled()
      clearInterval(interval)
    })
  })

  describe('Calorie Calculation', () => {
    let mockWss: WebSocketServer
    let mockServices: {
      tabataService: TabataTimer
      spotifyService: SpotifyPolling
    }
    let getSnapshot: () => StateSnapshot

    beforeEach(() => {
      jest.useFakeTimers()
      mockWss = new (WebSocketServer as jest.Mock)()
      mockServices = {
        tabataService: {
          handleCommand: jest.fn(),
          setMode: jest.fn(),
        } as unknown as TabataTimer,
        spotifyService: {
          handleCommand: jest.fn(),
        } as unknown as SpotifyPolling,
      }
      getSnapshot = jest.fn()
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllMocks()
      ;(mockWss.clients as Set<MockWebSocket>).clear()
      // Reset module-level state to ensure test isolation
      resetSocketManager()
    })

    it('should accumulate calories correctly with small frequent updates', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

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
      const lastBroadcastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const broadcastPayload: HrmData[] = lastBroadcastCall[0].payload

      // Find the client that has updated calories
      const clientData = broadcastPayload.find((c) => c.calories > 0)

      expect(clientData).toBeDefined()
      // Use non-null assertion as we've checked definition
      expect(clientData!.calories).toBeGreaterThan(1)
    })

    it('should use the default weight if the client sends an invalid weight', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

      // Send an invalid weight
      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150, weightKg: 10 },
      })
      jest.advanceTimersByTime(1000)
      mockWs.emit('message', message.toString())

      // Check that the default weight was used in the calorie calculation
      const mockBroadcast = broadcast as jest.Mock
      const lastBroadcastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const broadcastPayload: HrmData[] = lastBroadcastCall[0].payload
      const clientData = broadcastPayload.find((c) => c.calories > 0)

      expect(clientData).toBeDefined()
      // This is a rough check, but it should be greater than 0
      expect(clientData!.calories).toBeGreaterThan(0)
    })

    it('should use the client-provided weight in the calorie calculation', () => {
      initSocketManager(mockWss, mockServices, getSnapshot)
      const mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)

      // Send a valid weight
      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150, weightKg: 100 },
      })
      jest.advanceTimersByTime(1000)
      mockWs.emit('message', message.toString())

      // Check that the client-provided weight was used in the calorie calculation
      const mockBroadcast = broadcast as jest.Mock
      const lastBroadcastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      const broadcastPayload: HrmData[] = lastBroadcastCall[0].payload
      const clientData = broadcastPayload.find((c) => c.calories > 0)

      expect(clientData).toBeDefined()
      // This is a rough check, but it should be greater than 0
      expect(clientData!.calories).toBeGreaterThan(0)
    })
  })

  describe('Message Handling', () => {
    let mockWss: WebSocketServer
    let mockServices: {
      tabataService: TabataTimer
      spotifyService: SpotifyPolling
    }
    let getSnapshot: () => StateSnapshot
    let mockWs: MockWebSocket

    beforeEach(() => {
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
        timer: {
          /* mock timer state */
        },
        spotify: {
          /* mock spotify state */
        },
      })
      initSocketManager(mockWss, mockServices, getSnapshot)

      mockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      mockWss.emit('connection', mockWs)
    })

    afterEach(() => {
      jest.clearAllMocks()
      ;(mockWss.clients as Set<MockWebSocket>).clear()
      resetSocketManager()
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
      expect(mockWs.send).toHaveBeenCalled()
      const sentData = JSON.parse((mockWs.send as jest.Mock).mock.calls[0][0])
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
      expect(broadcast).toHaveBeenCalledWith({
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

      expect(dashboardWs.send).toHaveBeenCalled()
      expect(controllerWs.send).not.toHaveBeenCalled()
      expect(mockServices.spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        undefined,
        undefined,
        undefined
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
