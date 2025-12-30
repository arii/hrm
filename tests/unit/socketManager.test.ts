/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'
import { Server as WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ExtWebSocket } from '../../types/websocket'
import { broadcast, sendWebSocketMessage } from '../../utils/websocketUtils.js'

// Hoisted mock instances
var mockHrmRepoInstance = {
  findById: jest.fn(),
  save: jest.fn(),
  deleteById: jest.fn(),
  findAll: jest.fn(),
  clear: jest.fn(), // Added missing clear method
}
var mockSessionRepoInstance = {
  findById: jest.fn(),
  save: jest.fn(),
  deleteById: jest.fn(),
}

// Mock dependencies
jest.mock('@/lib/repositories/RedisHrmDataRepository', () => ({
  RedisHrmDataRepository: jest.fn(() => mockHrmRepoInstance),
}))
jest.mock('@/lib/repositories/RedisClientSessionRepository', () => ({
  RedisClientSessionRepository: jest.fn(() => mockSessionRepoInstance),
}))
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: { withAccessToken: jest.fn() },
  AccessToken: jest.fn(),
}))
jest.mock('../../utils/websocketUtils.js', () => ({
  sendWebSocketMessage: jest.fn(),
  broadcast: jest.fn(),
  ConnectionMonitor: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}))
jest.mock('ws', () => ({
  Server: jest.fn(() => {
    const wss = new EventEmitter()
    wss.clients = new Set()
    wss.on = jest.fn(wss.on.bind(wss))
    wss.emit = jest.fn(wss.emit.bind(wss))
    return wss
  }),
  WebSocket: jest.fn(),
}))

class MockWebSocket extends EventEmitter {
  isAlive = true
  readyState = 1
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  constructor() {
    super()
  }
}

const createMockServices = () => ({
  tabataService: {
    handleCommand: jest.fn(),
    getSnapshot: jest.fn(() => ({})),
  } as unknown as jest.Mocked<TabataTimer>,
  spotifyService: {
    handleCommand: jest.fn(),
    getSnapshot: jest.fn(() => ({})),
  } as unknown as jest.Mocked<SpotifyPolling>,
})

describe('WebSocket Manager (Redis)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.values(mockHrmRepoInstance).forEach((mockFn) => mockFn.mockReset())
    Object.values(mockSessionRepoInstance).forEach((mockFn) =>
      mockFn.mockReset()
    )
    resetSocketManager()
  })

  const setupTestEnvironment = () => {
    const mockWss =
      new (WebSocketServer as any)() as jest.Mocked<WebSocketServer>
    const mockServices = createMockServices()
    const getSnapshot = jest.fn(() => ({ timer: {}, spotify: {}, hrm: {} }))
    initSocketManager(mockWss, getSnapshot, mockServices)
    return { mockWss, getSnapshot }
  }

  describe('Connection Handling', () => {
    it('should create and save a new client if one does not exist', async () => {
      const { mockWss } = setupTestEnvironment()
      mockHrmRepoInstance.findById.mockResolvedValue(undefined)
      const newWs = new MockWebSocket() as ExtWebSocket
      newWs.clientId = 'new-client'

      mockWss.emit('connection', newWs)
      await new Promise(process.nextTick)

      expect(mockHrmRepoInstance.save).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'new-client' })
      )
      expect(mockSessionRepoInstance.save).toHaveBeenCalledWith(
        'new-client',
        expect.any(Object)
      )
      expect(broadcast).toHaveBeenCalled()
    })

    it('should handle client disconnect and delete data', async () => {
      const { mockWss } = setupTestEnvironment()
      const ws = new MockWebSocket() as ExtWebSocket
      ws.clientId = 'test-client'
      mockWss.clients.add(ws as any)
      mockWss.emit('connection', ws)
      await new Promise(process.nextTick)

      ws.emit('close')
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockHrmRepoInstance.deleteById).toHaveBeenCalledWith('test-client')
      expect(mockSessionRepoInstance.deleteById).toHaveBeenCalledWith(
        'test-client'
      )
      expect(broadcast).toHaveBeenCalled()
    })
  })

  describe('Message Handling (Async)', () => {
    it('should send initial state on GET_STATE message', async () => {
      const { mockWss, getSnapshot } = setupTestEnvironment()
      mockHrmRepoInstance.findAll.mockResolvedValue([
        { clientId: 'test', value: 120 },
      ])
      const mockWs = new MockWebSocket()
      mockWss.emit('connection', mockWs)
      await new Promise(process.nextTick)

      const message = JSON.stringify({ type: 'GET_STATE' })
      mockWs.emit('message', message)
      await new Promise(process.nextTick)

      expect(getSnapshot).toHaveBeenCalled()
      expect(sendWebSocketMessage).toHaveBeenCalled()
      const sentData = (sendWebSocketMessage as jest.Mock).mock.calls[0][1]
      expect(sentData.type).toBe('INITIAL_STATE')
    })

    it('should update calorie count on HRM_INPUT', async () => {
      const { mockWss } = setupTestEnvironment()
      mockHrmRepoInstance.findById.mockResolvedValue({
        clientId: 'test-client',
        value: 120,
        age: 30,
      })
      mockSessionRepoInstance.findById.mockResolvedValue({
        lastUpdate: Date.now() - 60000,
        accumulatedCalories: 10,
      })
      const mockWs = new MockWebSocket() as ExtWebSocket
      mockWs.clientId = 'test-client'
      mockWss.emit('connection', mockWs)

      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150 },
      })
      mockWs.emit('message', message)
      await new Promise(process.nextTick)

      expect(mockSessionRepoInstance.save).toHaveBeenCalled()
      expect(mockHrmRepoInstance.save).toHaveBeenCalled()
      const [, sessionSaveArgs] = (mockSessionRepoInstance.save as jest.Mock)
        .mock.calls[0]
      expect(sessionSaveArgs.accumulatedCalories).toBeGreaterThan(10)
    })
  })
})
