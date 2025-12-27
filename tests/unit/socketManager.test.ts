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
  describe('HRM Data Handling and Reconnection', () => {
    it('should migrate HRM data when a device reconnects with a new client ID', () => {
      const deviceId = 'test-device-123'
      const initialClientId = (mockWs as any).clientId

      // 1. Initial connection and metadata update
      const metadataMessage = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { deviceId, name: 'Test Device', maxHr: 180 },
      })
      mockWs.emit('message', metadataMessage)

      // 2. Simulate disconnect
      mockWs.emit('close')

      // 3. Simulate reconnect with a new WebSocket client
      const newMockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(newMockWs)
      mockWss.emit('connection', newMockWs)
      const newClientId = (newMockWs as any).clientId

      // 4. Send metadata from the new client
      newMockWs.emit('message', metadataMessage)

      // 5. Verify that the data was migrated
      expect(broadcast).toHaveBeenCalled()
      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload = lastBroadcastCall[1].payload
      const deviceData = payload.find((d: HrmData) => d.deviceId === deviceId)

      expect(deviceData).toBeDefined()
      expect(deviceData.clientId).toBe(newClientId)
      expect(deviceData.name).toBe('Test Device')

      // Verify that the old client ID is no longer present
      const oldDeviceData = payload.find(
        (d: HrmData) => d.clientId === initialClientId
      )
      expect(oldDeviceData).toBeUndefined()
    })

    it('should clean up stale HRM data after a timeout', () => {
      jest.useFakeTimers()
      const deviceId = 'stale-device-456'

      // 1. Initial connection
      const metadataMessage = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { deviceId, name: 'Stale Device' },
      })
      mockWs.emit('message', metadataMessage)

      // 2. Disconnect to start the cleanup timer
      mockWs.emit('close')

      // 3. Advance timers past the cleanup threshold
      jest.advanceTimersByTime(5 * 60 * 1000 + 100)

      // 4. Verify that the data has been cleaned up
      expect(broadcast).toHaveBeenCalled()
      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload = lastBroadcastCall[1].payload
      const deviceData = payload.find((d: HrmData) => d.deviceId === deviceId)

      expect(deviceData).toBeUndefined()
      jest.useRealTimers()
    })

    it('should cancel cleanup timer if the device reconnects in time', () => {
      jest.useFakeTimers()
      const deviceId = 'reconnecting-device-789'

      // 1. Initial connection
      const metadataMessage = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { deviceId, name: 'Reconnecting Device' },
      })
      mockWs.emit('message', metadataMessage)

      // 2. Disconnect
      mockWs.emit('close')

      // 3. Reconnect before the timer fires
      const newMockWs = new MockWebSocket()
      ;(mockWss.clients as Set<MockWebSocket>).add(newMockWs)
      mockWss.emit('connection', newMockWs)
      newMockWs.emit('message', metadataMessage)

      // 4. Advance timers past the cleanup threshold
      jest.advanceTimersByTime(5 * 60 * 1000 + 100)

      // 5. Verify that the data was NOT cleaned up
      const lastBroadcastCall = (broadcast as jest.Mock).mock.calls.pop()
      const payload = lastBroadcastCall[1].payload
      const deviceData = payload.find((d: HrmData) => d.deviceId === deviceId)

      expect(deviceData).toBeDefined()
      jest.useRealTimers()
    })
  })
})
