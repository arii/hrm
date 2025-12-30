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
import { EventEmitter } from 'events'
import { Server as WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ExtWebSocket } from '../../types/websocket'

// Create stable, singleton mock instances for all dependencies.
// Ensure all async methods return promises to prevent test timeouts.
const mockHrmRepoInstance = {
  findById: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  deleteById: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn().mockResolvedValue([]),
  clear: jest.fn().mockResolvedValue(undefined),
}
const mockSessionRepoInstance = {
  findById: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  deleteById: jest.fn().mockResolvedValue(undefined),
}
const mockBroadcasterInstance = {
  broadcastHrmData: jest.fn().mockResolvedValue(undefined),
  subscribeToHrmData: jest.fn(), // This is synchronous in the mock
  disconnect: jest.fn().mockResolvedValue(undefined),
}

// Mock the modules to return the singleton instances when their constructors are called
jest.mock('@/lib/repositories/RedisHrmDataRepository', () => ({
  RedisHrmDataRepository: jest.fn(() => mockHrmRepoInstance),
}))
jest.mock('@/lib/repositories/RedisClientSessionRepository', () => ({
  RedisClientSessionRepository: jest.fn(() => mockSessionRepoInstance),
}))
jest.mock('@/lib/broadcaster', () => ({
  RedisPubSubBroadcaster: jest.fn(() => mockBroadcasterInstance),
}))

// Mock other dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk')
jest.mock('../../utils/websocketUtils.js')
jest.mock('ws', () => ({
  Server: jest.fn(() => new (require('events').EventEmitter)()),
}))

// Import the system under test *after* all mocks are defined.
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'

class MockWebSocket extends EventEmitter {
  isAlive = true
  readyState = 1
  terminate = jest.fn()
  ping = jest.fn()
  send = jest.fn()
  clientId?: string
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
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    Object.values(mockHrmRepoInstance).forEach((fn) => fn.mockClear())
    Object.values(mockSessionRepoInstance).forEach((fn) => fn.mockClear())
    Object.values(mockBroadcasterInstance).forEach((fn) => fn.mockClear())
    await resetSocketManager()
  })

  afterEach(async () => {
    await resetSocketManager()
  })

  const setupTestEnvironment = () => {
    const mockWss =
      new (WebSocketServer as any)() as jest.Mocked<WebSocketServer>
    mockWss.clients = new Set()
    const mockServices = createMockServices()
    const getSnapshot = jest.fn(() => ({ timer: {}, spotify: {}, hrm: {} }))
    initSocketManager(mockWss, getSnapshot, mockServices)
    return { mockWss, getSnapshot }
  }

  describe('Connection Handling', () => {
    it('should create a new client and broadcast', async () => {
      const { mockWss } = setupTestEnvironment()
      mockHrmRepoInstance.findById.mockResolvedValue(undefined)
      const newWs = new MockWebSocket()
      const mockReq = { headers: {}, url: '/' } as IncomingMessage

      mockWss.emit('connection', newWs, mockReq)
      await jest.runAllTimersAsync()

      expect(mockHrmRepoInstance.save).toHaveBeenCalled()
      expect(mockSessionRepoInstance.save).toHaveBeenCalled()
      expect(mockBroadcasterInstance.broadcastHrmData).toHaveBeenCalled()
    })

    it('should handle client disconnect and broadcast', async () => {
      const { mockWss } = setupTestEnvironment()
      const existingClientId = 'test-client-disconnect'
      mockHrmRepoInstance.findById.mockResolvedValue({
        clientId: existingClientId,
      })
      const ws = new MockWebSocket()
      // Corrected: Pass the clientId in the URL query parameter
      const mockReq = {
        headers: {},
        url: `/?clientId=${existingClientId}`,
      } as IncomingMessage
      mockWss.clients.add(ws as any)

      mockWss.emit('connection', ws, mockReq)
      await jest.runAllTimersAsync()
      mockBroadcasterInstance.broadcastHrmData.mockClear()

      ws.emit('close')
      await jest.runAllTimersAsync()

      expect(mockHrmRepoInstance.deleteById).toHaveBeenCalledWith(
        existingClientId
      )
      expect(mockSessionRepoInstance.deleteById).toHaveBeenCalledWith(
        existingClientId
      )
      expect(mockBroadcasterInstance.broadcastHrmData).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    it('should update calorie count and broadcast on HRM_INPUT', async () => {
      const { mockWss } = setupTestEnvironment()
      const existingClientId = 'test-client-hrm'
      mockHrmRepoInstance.findById.mockResolvedValue({
        clientId: existingClientId,
        value: 120,
        age: 30,
      })
      mockSessionRepoInstance.findById.mockResolvedValue({
        lastUpdate: Date.now() - 60000,
        accumulatedCalories: 10,
      })
      const mockWs = new MockWebSocket() as ExtWebSocket
      // Corrected: Pass the clientId in the URL query parameter
      const mockReq = {
        headers: {},
        url: `/?clientId=${existingClientId}`,
      } as IncomingMessage

      mockWss.emit('connection', mockWs, mockReq)
      await jest.runAllTimersAsync()
      mockBroadcasterInstance.broadcastHrmData.mockClear()

      const message = JSON.stringify({
        type: 'HRM_INPUT',
        data: { value: 150 },
      })
      mockWs.emit('message', message)
      await jest.runAllTimersAsync()

      expect(mockSessionRepoInstance.save).toHaveBeenCalled()
      expect(mockHrmRepoInstance.save).toHaveBeenCalled()
      expect(mockBroadcasterInstance.broadcastHrmData).toHaveBeenCalled()
    })
  })
})
