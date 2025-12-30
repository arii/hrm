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
import { StateSnapshot, ExtWebSocket } from '../../types/websocket'
import { broadcast, sendWebSocketMessage } from '../../utils/websocketUtils.js'
import { RedisHrmDataRepository } from '@/lib/repositories/RedisHrmDataRepository'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

jest.mock('@/lib/repositories/RedisHrmDataRepository')

// Mock ConnectionMonitor and other utils
jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(), // Will be mocked by broadcaster mock
  ConnectionMonitor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

// Mock ws module
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => {
    const wss = new EventEmitter() as jest.Mocked<WebSocketServer>
    wss.clients = new Set<MockWebSocket>()
    wss.on = jest.fn(wss.on.bind(wss))
    wss.emit = jest.fn(wss.emit.bind(wss))
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
  readyState = 1 // WebSocket.OPEN

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

describe('WebSocket Manager (Redis)', () => {
  let mockWss: jest.Mocked<WebSocketServer>
  let mockServices: {
    tabataService: jest.Mocked<TabataTimer>
    spotifyService: jest.Mocked<SpotifyPolling>
  }
  let getSnapshot: () => StateSnapshot
  let mockWs: MockWebSocket

  beforeEach(async () => {
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

    mockWs = new MockWebSocket()
    ;(mockWss.clients as Set<MockWebSocket>).add(mockWs)

    // Simulate connection event
    mockWss.emit('connection', mockWs)
    await new Promise(process.nextTick) // Allow async operations in on 'connection' to complete
  })

  afterEach(async () => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    await resetSocketManager()
  })

  describe('Connection Handling', () => {
    it('should create and save a new client if one does not exist', async () => {
      const mockRepo =
        new RedisHrmDataRepository() as jest.Mocked<RedisHrmDataRepository>
      mockRepo.findById.mockResolvedValue(undefined)

      const newWs = new MockWebSocket() as ExtWebSocket
      newWs.clientId = 'new-client'

      mockWss.emit('connection', newWs)
      await new Promise(process.nextTick)

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'new-client' })
      )
      expect(broadcast).toHaveBeenCalled()
    })

    it('should handle client disconnect and broadcast state', async () => {
      const mockRepo =
        new RedisHrmDataRepository() as jest.Mocked<RedisHrmDataRepository>
      mockRepo.findAll.mockResolvedValue([])

      mockWs.emit('close')
      jest.runAllTimers()
      await new Promise(process.nextTick)

      expect(mockRepo.deleteById).toHaveBeenCalled()
      expect(broadcast).toHaveBeenCalledWith({
        type: 'HRM_UPDATE',
        payload: [],
      })
    })
  })

  describe('Message Handling (Async)', () => {
    it('should send initial state on GET_STATE message', async () => {
      const mockRepo =
        new RedisHrmDataRepository() as jest.Mocked<RedisHrmDataRepository>
      mockRepo.findAll.mockResolvedValue([
        {
          clientId: 'test',
          value: 120,
          maxHr: 180,
          age: 30,
          calories: 10,
          name: 'tester',
        },
      ])

      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message.toString())
      await new Promise(process.nextTick)

      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.type).toBe('INITIAL_STATE')
      expect(sentData.payload.hrmData).toHaveLength(1)
    })

    it('should handle HRM_INPUT and update repository', async () => {
      const mockRepo =
        new RedisHrmDataRepository() as jest.Mocked<RedisHrmDataRepository>
      const clientId = (mockWs as ExtWebSocket).clientId
      const initialData = {
        clientId,
        value: 120,
        maxHr: 180,
        age: 30,
        calories: 10,
        name: 'tester',
      }
      mockRepo.findById.mockResolvedValue(initialData)

      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150 },
      })
      mockWs.emit('message', message.toString())
      await new Promise(process.nextTick)

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ value: 150 })
      )
      expect(broadcast).toHaveBeenCalled()
    })

    it('should handle HRM_METADATA_UPDATE and update repository', async () => {
      const mockRepo =
        new RedisHrmDataRepository() as jest.Mocked<RedisHrmDataRepository>
      const clientId = (mockWs as ExtWebSocket).clientId
      const initialData = {
        clientId,
        value: 120,
        maxHr: 180,
        age: 30,
        calories: 10,
        name: 'tester',
      }
      mockRepo.findById.mockResolvedValue(initialData)

      const message = JSON.stringify({
        type: 'HRM_METADATA_UPDATE',
        data: { name: 'new-name' },
      })
      mockWs.emit('message', message.toString())
      await new Promise(process.nextTick)

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'new-name' })
      )
      expect(broadcast).toHaveBeenCalled()
    })
  })
})
