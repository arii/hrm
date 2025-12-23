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
  handleIncomingMessage,
  handleDisconnect,
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
import { broadcast, sendWebSocketMessage } from '../../utils/websocketUtils.js'
import logger from '@/utils/logger'
import { serviceContainer } from '../../lib/serviceContainer.js'
import { HrmDataService } from '../../lib/services/HrmDataService.js'
import { fail } from 'assert'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('../../lib/serviceContainer.js')
jest.mock('../../lib/services/HrmDataService.js')
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
  let mockWss: WebSocketServer
  let mockServices: {
    tabataService: TabataTimer
    spotifyService: SpotifyPolling
  }
  let getSnapshot: () => StateSnapshot
  let mockWs: MockWebSocket

  beforeEach(async () => {
    jest.useFakeTimers()

    // Mock HrmDataService with an in-memory map for each test
    const mockDataStore = new Map<string, HrmData>()
    ;(HrmDataService as jest.Mock).mockImplementation(() => {
      return {
        save: jest.fn().mockImplementation(async (hrm: HrmData) => {
          mockDataStore.set(hrm.clientId, hrm)
        }),
        findById: jest.fn().mockImplementation(async (id: string) => {
          return mockDataStore.get(id)
        }),
        findAll: jest.fn().mockImplementation(async () => {
          return Array.from(mockDataStore.values())
        }),
        deleteById: jest.fn().mockImplementation(async (id: string) => {
          mockDataStore.delete(id)
        }),
        clear: jest.fn().mockImplementation(async () => {
          mockDataStore.clear()
        }),
        close: jest.fn().mockImplementation(async () => {}),
      }
    })

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
    await mockWss.emit('connection', mockWs)
  })

  afterEach(async () => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    await resetSocketManager()
  })

  describe('Heartbeat and Watchdog', () => {
    it('should set lastPingTime on new connection', async () => {
      const mockWs = new MockWebSocket() as unknown as ExtWebSocket
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      await mockWss.emit('connection', mockWs) // Manually trigger connection event

      expect(mockWs.lastPingTime).toBeDefined()
      expect(mockWs.lastPingTime).toBeLessThanOrEqual(Date.now())
    })

    it('should update lastPingTime on PING message and respond with PONG', async () => {
      const mockWs = new MockWebSocket() as unknown as ExtWebSocket
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      await mockWss.emit('connection', mockWs)

      const initialPingTime = mockWs.lastPingTime
      jest.advanceTimersByTime(1000)

      // Simulate a PING message from the client
      const message = JSON.stringify({ type: 'PING' })
      await handleIncomingMessage(mockWs, message, (mockWs as any).clientId)

      expect(mockWs.lastPingTime).toBeGreaterThan(initialPingTime!)
      expect(sendWebSocketMessage).toHaveBeenCalledWith(
        mockWs,
        { type: 'PONG' },
        'socketManager.PING'
      )
    })

    it('should terminate a client if no ping is received within the timeout', () => {
      // Do NOT simulate a ping. Advance time past the client inactivity timeout (120s)
      // and the watchdog interval (30s) to ensure the check that terminates runs.
      jest.advanceTimersByTime(150000)

      expect(mockWs.terminate).toHaveBeenCalledTimes(1)
    })

    it('should NOT terminate a client that is responsive', async () => {
      const mockWs = new MockWebSocket() as unknown as ExtWebSocket
      ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)
      await mockWss.emit('connection', mockWs)

      // Simulate responsiveness by sending pings
      const interval = setInterval(async () => {
        const message = JSON.stringify({ type: 'PING' })
        await handleIncomingMessage(mockWs, message, (mockWs as any).clientId)
      }, 25000) // Send a ping every 25 seconds

      jest.advanceTimersByTime(150000) // Advance well past the timeout

      expect(mockWs.terminate).not.toHaveBeenCalled()
      clearInterval(interval)
    })
  })

  describe('Calorie Calculation', () => {
    it('should accumulate calories correctly with small frequent updates', async () => {
      try {
        const sendHrmInput = async (hr: number) => {
          const message = JSON.stringify({
            type: 'HRM_INPUT',
            data: { value: hr, age: 30 },
          })
          await handleIncomingMessage(
            mockWs as any,
            message,
            (mockWs as any).clientId
          )
        }

        // Initial input
        await sendHrmInput(150)

        // Send 100 updates, each 100ms apart
        // Should accumulate significant calories even if each step < 0.1 kcal
        for (let i = 0; i < 100; i++) {
          jest.advanceTimersByTime(100) // 100ms
          await sendHrmInput(150)
        }

        // Check the last broadcasted state
        const mockBroadcast = broadcast as jest.Mock
        expect(mockBroadcast).toHaveBeenCalled()
        const lastCall =
          mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
        const finalPayload: HrmData[] = lastCall[1].payload
        const hrmDataService = new HrmDataService();
        const clientData = await hrmDataService.findById((mockWs as any).clientId);

        expect(clientData).toBeDefined()
        expect(clientData!.calories).toBeGreaterThan(0.1)
        // A more precise check based on the known formula for short duration.
        // 100 updates * 100ms = 10 seconds = 0.1667 minutes.
        // With HR=150, Age=30, Weight=75, the calories should be roughly > 1.
        expect(clientData!.calories).toBeGreaterThan(1)
      } catch (error) {
        fail(error)
      }
    })
  })

  describe('Message Handling', () => {
    it('should handle REGISTER_CLIENT message', async () => {
      const message = JSON.stringify({
        type: 'REGISTER_CLIENT',
        role: 'dashboard',
      })
      await handleIncomingMessage(
        mockWs as any,
        message,
        (mockWs as any).clientId
      )
      expect(mockWs.clientType).toBe('dashboard')
    })

    it('should send initial state on GET_STATE message', async () => {
      try {
        const message = JSON.stringify({ type: 'GET_STATE' })
        await handleIncomingMessage(
          mockWs as any,
          message,
          (mockWs as any).clientId
        )

        expect(getSnapshot).toHaveBeenCalled()
        expect(sendWebSocketMessage).toHaveBeenCalled()
        const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
        expect(sentData.type).toBe('INITIAL_STATE')
        expect(sentData.payload).toHaveProperty('timer')
        expect(sentData.payload).toHaveProperty('spotify')
        expect(sentData.payload).toHaveProperty('hrmData')
      } catch (error) {
        fail(error)
      }
    })

    it('should handle invalid JSON gracefully', async () => {
      await handleIncomingMessage(
        mockWs as any,
        'invalid json',
        (mockWs as any).clientId
      )
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object),
        'Error processing incoming message'
      )
    })

    it('should handle Zod validation errors gracefully', async () => {
      const message = JSON.stringify({ type: 'INVALID_TYPE' })
      await handleIncomingMessage(
        mockWs as any,
        message,
        (mockWs as any).clientId
      )
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object),
        'WebSocket message validation failed'
      )
    })

    it('should broadcast state on client disconnect', async () => {
      try {
        await handleDisconnect((mockWs as any).clientId)
        expect(broadcast).toHaveBeenCalledWith(
          mockWss,
          {
            type: 'HRM_UPDATE',
            payload: [],
          },
          'socketManager.broadcastState'
        )
      } catch (error) {
        fail(error)
      }
    })

    it('should forward SPOTIFY_COMMAND to dashboard clients', async () => {
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
      await handleIncomingMessage(
        mockWs as any,
        message,
        (mockWs as any).clientId
      )

      expect(sendWebSocketMessage).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalledWith(
        dashboardWs,
        expect.objectContaining({ type: 'EXECUTE_SPOTIFY' }),
        'socketManager.SPOTIFY_COMMAND'
      )
      expect(mockServices.spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        undefined,
        undefined,
        undefined
      )
    })

    it('should handle unknown message types', async () => {
      const message = JSON.stringify({ type: 'SOME_GARBAGE' })
      jest
        .spyOn(ClientCommandMessageSchema, 'parse')
        .mockReturnValue({ type: 'SOME_GARBAGE' })

      await handleIncomingMessage(
        mockWs as any,
        message,
        (mockWs as any).clientId
      )

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Unknown message type received'
      )
    })
  })
})
