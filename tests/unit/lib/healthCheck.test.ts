/**
 * @jest-environment node
 */
import {
  checkMemoryUsage,
  checkSpotifyAPI,
  checkWebSocketService,
  checkTimerService,
} from '../../../lib/healthCheck'
import { WebSocket } from 'ws'
import TabataTimer from '../../../services/tabataTimer'
import { EventEmitter } from 'events'

// Mock the 'ws' module
jest.mock('ws')

// Mock global fetch
global.fetch = jest.fn()

describe('Health Check Logic', () => {
  const MockedWebSocket = WebSocket as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    MockedWebSocket.mockClear()
  })

  describe('checkMemoryUsage', () => {
    it('should return healthy if memory usage is within limits', () => {
      const result = checkMemoryUsage()
      expect(result.healthy).toBe(true)
      expect(result.details.usedMB).toBeGreaterThan(0)
    })
  })

  describe('checkSpotifyAPI', () => {
    it('should return healthy when Spotify API is reachable', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      })
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy when Spotify API is unreachable', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(false)
    })
  })

  describe('checkWebSocketService', () => {
    it('should return healthy when WebSocket connection is successful', async () => {
      const mockWsInstance = new EventEmitter()
      // Add mock methods that are called in the implementation
      mockWsInstance.close = jest.fn()
      mockWsInstance.terminate = jest.fn()

      MockedWebSocket.mockImplementation(() => {
        // Use process.nextTick to simulate the async nature of the connection
        process.nextTick(() => mockWsInstance.emit('open'))
        return mockWsInstance
      })

      const result = await checkWebSocketService()
      expect(result.healthy).toBe(true)
      expect(result.details.status).toBe('connected')
    })

    it('should return unhealthy when WebSocket connection fails', async () => {
      const mockWsInstance = new EventEmitter()
      mockWsInstance.close = jest.fn()
      mockWsInstance.terminate = jest.fn()

      MockedWebSocket.mockImplementation(() => {
        process.nextTick(() =>
          mockWsInstance.emit('error', new Error('Connection failed'))
        )
        return mockWsInstance
      })

      const result = await checkWebSocketService()
      expect(result.healthy).toBe(false)
      expect(result.details.status).toBe('failed')
      expect((result.details.error as string)).toContain('Connection failed')
    })

    it('should return unhealthy when WebSocket connection times out', async () => {
      const mockWsInstance = new EventEmitter()
      mockWsInstance.close = jest.fn()
      mockWsInstance.terminate = jest.fn()

      // The mock never emits 'open' or 'error', forcing a timeout
      MockedWebSocket.mockImplementation(() => mockWsInstance)

      const result = await checkWebSocketService()
      expect(result.healthy).toBe(false)
      expect(result.details.status).toBe('failed')
      expect((result.details.error as string)).toContain('timed out')
    })
  })

  describe('checkTimerService', () => {
    it('should return healthy when timer service is active', () => {
      const mockTimer = { getState: () => ({}) } as TabataTimer
      const result = checkTimerService(mockTimer)
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })
})
