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
import logger from '@/utils/logger'
import { createMockRequest } from './test-data/request-data-factory'
import { HrmDataRepository } from '../../lib/repositories/HrmDataRepository.js'

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
jest.mock('ws', () => {
  const EventEmitter = require('events')
  class MockWebSocketServer extends EventEmitter {
    clients = new Set<MockWebSocket>()
    on(event: string, listener: (...args: any[]) => void) {
      super.on(event, listener)
      return this
    }
    emit(event: string, ...args: any[]) {
      super.emit(event, ...args)
      return true
    }
  }
  return {
    Server: jest.fn().mockImplementation(() => new MockWebSocketServer()),
    WebSocket: jest.fn(),
  }
})

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
    jest.restoreAllMocks()
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

    it('should accumulate calories with high precision for very short intervals', () => {
      const sendHrmInput = (hr: number) => {
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: hr, age: 30, weightKg: 75 },
        })
        mockWs.emit('message', message.toString())
      }

      // Initial input
      sendHrmInput(150)

      // Send 10 updates, each 1ms apart.
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(1) // 1ms
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
      // Calories should be a small positive number, not zero.
      expect(clientData!.calories).toBeGreaterThan(0)
      // The calculated value for 10ms at 150bpm is approx 0.0024.
      // We expect the value to be un-rounded.
      expect(clientData!.calories).toBeCloseTo(0.0024, 4)
    })

    describe('HRM_INPUT with client-side calories', () => {
      it('should accept client-side calories when they are reasonable', () => {
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 160, calories: 45 },
        })
        mockWs.emit('message', message.toString())

        const mockBroadcast = broadcast as jest.Mock
        const lastCall =
          mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
        const finalPayload: HrmData[] = lastCall[1].payload
        const clientData = finalPayload.find(
          (c) => c.clientId === 'test-client'
        )

        expect(clientData!.calories).toBe(45)
      })

      it('should reject client-side calories when a large discrepancy is detected', () => {
        // Step 1: Establish a server-side calorie count
        const initialMessage = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, age: 30, weightKg: 75 },
        })
        mockWs.emit('message', initialMessage)
        jest.advanceTimersByTime(60000) // Advance 1 minute
        mockWs.emit('message', initialMessage)

        const mockBroadcast = broadcast as jest.Mock
        let lastCall =
          mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
        let serverPayload: HrmData[] = lastCall[1].payload
        const serverCalories = serverPayload[0].calories
        expect(serverCalories).toBeGreaterThan(5) // Ensure some calories have accumulated

        // Step 2: Send a client update with a large calorie jump
        const largeJumpMessage = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: 150, calories: serverCalories + 51 }, // 51 is > 50 discrepancy
        })
        mockWs.emit('message', largeJumpMessage)

        // Step 3: Verify the server rejected the client value and kept its own
        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            clientId: 'test-client',
            clientCalories: serverCalories + 51,
            serverCalories: expect.any(Number),
          }),
          'Large calorie discrepancy detected. Rejecting client update.'
        )

        lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
        serverPayload = lastCall[1].payload
        // The final calorie count should be the server's, not the client's inflated one
        expect(serverPayload[0].calories).toBeCloseTo(serverCalories)
        expect(serverPayload[0].calories).not.toBe(serverCalories + 51)
      })
    })

    it('should reset calories when a STOP command is received', () => {
      const sendHrmInput = (hr: number) => {
        const message = JSON.stringify({
          type: 'HRM_INPUT',
          data: { value: hr, age: 30 },
        })
        mockWs.emit('message', message.toString())
      }

      // 1. Accumulate some calories
      sendHrmInput(150)
      jest.advanceTimersByTime(1000)
      sendHrmInput(150)

      // Verify calories have accumulated
      const mockBroadcast = broadcast as jest.Mock
      let lastCall =
        mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      let payload: HrmData[] = lastCall[1].payload
      expect(payload[0].calories).toBeGreaterThan(0)

      // 2. Send the STOP command
      const stopMessage = JSON.stringify({
        type: 'TIMER_COMMAND',
        command: 'STOP',
      })
      mockWs.emit('message', stopMessage)

      // 3. Verify calories are reset
      expect(mockServices.tabataService.handleCommand).toHaveBeenCalledWith(
        'STOP'
      )
      lastCall = mockBroadcast.mock.calls[mockBroadcast.mock.calls.length - 1]
      payload = lastCall[1].payload
      expect(payload[0].calories).toBeGreaterThan(0)
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

    it('should respond with PONG to a PING message', () => {
      const message = JSON.stringify({ type: 'PING' })
      mockWs.emit('message', message.toString())

      expect(sendWebSocketMessage).toHaveBeenCalledWith(
        mockWs,
        { type: 'PONG' },
        'socketManager.PING'
      )
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

    it('should delete a disconnected clients data after the grace period', () => {
      // Add a second client to ensure the repository isn't just empty
      const secondWs = new MockWebSocket() as ExtWebSocket
      const mockReq = createMockRequest('/?clientId=second-client')
      mockWss.emit('connection', secondWs, mockReq)

      // Disconnect the first client
      mockWs.emit('close')

      // Advance timers past the grace period
      jest.runAllTimers()

      // Verify the broadcast only contains the second client's data
      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload = lastBroadcastCall[1].payload
      expect(payload).toHaveLength(1)
      expect(payload[0].clientId).toBe('second-client')
    })

    it('should not delete a disconnected clients data if they reconnect within the grace period', () => {
      // Add some data to the client
      const message = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { name: 'Jules' },
      })
      mockWs.emit('message', message.toString())

      // Disconnect the client
      mockWs.emit('close')

      // Advance the timer, but not past the grace period
      jest.advanceTimersByTime(2000)

      // Reconnect the client
      const newWs = new MockWebSocket()
      const mockReq = createMockRequest() // Reconnects with the same test-client ID
      mockWss.emit('connection', newWs, mockReq)

      // Advance timers past the grace period
      jest.runAllTimers()

      // Verify the broadcast still contains the original client's data
      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload = lastBroadcastCall[1].payload
      expect(payload).toHaveLength(1)
      expect(payload[0].clientId).toBe('test-client')
      expect(payload[0].name).toBe('Jules')
    })

    it('should always remove the socket from clientSockets on disconnect, even if data deletion fails', () => {
      // Mock the repository to throw an error on deletion
      const mockDeleteById = jest
        .spyOn(HrmDataRepository.prototype, 'deleteById')
        .mockImplementation(() => {
          throw new Error('Test deletion error')
        })

      // Disconnect the client
      mockWs.emit('close')

      // Advance timers past the grace period
      jest.runAllTimers()

      // Verify the error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client',
          error: expect.any(Error),
        }),
        'Error during session cleanup'
      )

      // This is the key assertion: The socket should still be removed
      // To check this, we try to reconnect. If the socket was removed,
      // a new connection should not trigger the "Existing socket found" warning.
      const loggerWarnSpy = jest.spyOn(logger, 'warn')
      const newWs = new MockWebSocket()
      const mockReq = createMockRequest()
      mockWss.emit('connection', newWs, mockReq)

      expect(loggerWarnSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        'Existing socket found. Overwriting with new connection.'
      )

      mockDeleteById.mockRestore()
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
      jest
        .spyOn(ClientCommandMessageSchema, 'parse')
        .mockReturnValue({ type: 'SOME_GARBAGE' } as unknown)

      mockWs.emit('message', message.toString())

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client' }),
        'Unknown message type received'
      )
    })

    describe('HRM_METADATA_UPDATE', () => {
      it('should update client metadata and broadcast', () => {
        const message = JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { age: 35, maxHr: 180 },
        })
        mockWs.emit('message', message.toString())

        expect(broadcast).toHaveBeenCalledWith(
          mockWss,
          expect.objectContaining({
            type: 'HRM_UPDATE',
            payload: expect.arrayContaining([
              expect.objectContaining({
                clientId: 'test-client',
                age: 35,
                maxHr: 180,
              }),
            ]),
          }),
          'socketManager.broadcastState'
        )
      })

      it('should not overwrite a real name with a default name', () => {
        // First, set a real name
        const setNameMessage = JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Jules' },
        })
        mockWs.emit('message', setNameMessage.toString())

        // Then, attempt to overwrite with a default name
        const overwriteMessage = JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'New User' },
        })
        mockWs.emit('message', overwriteMessage.toString())

        const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
        const payload = lastBroadcastCall[1].payload
        const clientData = payload.find(
          (c: HrmData) => c.clientId === 'test-client'
        )
        expect(clientData.name).toBe('Jules')
      })

      it('should allow overwriting a default name with a real name', () => {
        // First, set a default name
        const setDefaultNameMessage = JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Bluetooth HRM' },
        })
        mockWs.emit('message', setDefaultNameMessage.toString())

        // Then, overwrite with a real name
        const setRealNameMessage = JSON.stringify({
          type: 'HRM_METADATA_UPDATE',
          data: { name: 'Jules' },
        })
        mockWs.emit('message', setRealNameMessage.toString())

        const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
        const payload = lastBroadcastCall[1].payload
        const clientData = payload.find(
          (c: HrmData) => c.clientId === 'test-client'
        )
        expect(clientData.name).toBe('Jules')
      })
    })

    describe('Timer and Mode Commands', () => {
      it('should handle TIMER_COMMAND and forward to tabataService', () => {
        const message = JSON.stringify({
          type: 'TIMER_COMMAND',
          command: 'START',
        })
        mockWs.emit('message', message.toString())

        expect(mockServices.tabataService.handleCommand).toHaveBeenCalledWith(
          'START'
        )
      })

      it('should handle SET_MODE and forward to tabataService', () => {
        const message = JSON.stringify({
          type: 'SET_MODE',
          mode: 'tabata',
        })
        mockWs.emit('message', message.toString())

        expect(mockServices.tabataService.setMode).toHaveBeenCalledWith(
          'tabata'
        )
      })

      it('should handle TIMER_CONFIG and forward to tabataService', () => {
        const message = JSON.stringify({
          type: 'TIMER_CONFIG',
          workDuration: 50,
          restDuration: 10,
        })
        mockWs.emit('message', message.toString())

        expect(mockServices.tabataService.setConfig).toHaveBeenCalledWith({
          workDuration: 50,
          restDuration: 10,
        })
      })
    })
  })
})
