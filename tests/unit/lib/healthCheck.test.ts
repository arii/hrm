/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'
import {
  checkMemoryUsage,
  checkSpotifyAPI,
  checkWebSocketService,
  checkTimerService,
} from '../../../lib/healthCheck'
import { WebSocket, Event } from 'ws'
import TabataTimer from '../../../services/tabataTimer'

// Mock the 'ws' module
jest.mock('ws')

// Use jest.mocked to get the mocked WebSocket class type
const MockedWebSocket = jest.mocked(WebSocket)

describe('Health Check Logic', () => {
  // Use jest.spyOn for global.fetch to avoid type casting
  let fetchSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    jest.clearAllMocks()
    fetchSpy = jest.spyOn(global, 'fetch')
    MockedWebSocket.mockClear()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  describe('checkMemoryUsage', () => {
    const originalMemoryUsage = process.memoryUsage

    afterEach(() => {
      process.memoryUsage = originalMemoryUsage
    })

    it('should return healthy if memory usage is within limits', () => {
      // Create a mock implementation that satisfies the return type of process.memoryUsage
      const mockMemoryUsage = jest.fn(() => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }))

      // Override the method
      process.memoryUsage = mockMemoryUsage

      const result = checkMemoryUsage()
      expect(result.healthy).toBe(true)
      expect(result.details.usedMB).toBe(50)
    })

    it('should return unhealthy if memory usage exceeds limits', () => {
      const mockMemoryUsage = jest.fn(() => ({
        rss: 1024 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }))

      process.memoryUsage = mockMemoryUsage

      const result = checkMemoryUsage()
      expect(result.healthy).toBe(false)
      expect(result.details.usedMB).toBe(600)
    })
  })

  describe('checkSpotifyAPI', () => {
    it('should return healthy when Spotify API is reachable', async () => {
      // Create a Response object to satisfy the fetch return type
      const mockResponse = new Response(null, { status: 401 })
      fetchSpy.mockResolvedValue(mockResponse)

      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy when Spotify API is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'))
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(false)
    })
  })

  describe('checkWebSocketService', () => {
    it('should return healthy when WebSocket connection is successful', async () => {
      // Implement a partial mock that satisfies the test requirements
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(() => {
          if (this.onopen) {
            const event: Event = { type: 'open', target: this }
            this.onopen(event)
          }
        }, 50)
        return this
      } as unknown as () => WebSocket)

      const result = await checkWebSocketService()
      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy when WebSocket connection fails', async () => {
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(() => {
          if (this.onerror) {
            const event: Event = {
                type: 'error',
                target: this,
                error: new Error('Connection failed'),
                message: 'Connection failed'
            }
            this.onerror(event)
          }
        }, 50)
        return this
      } as unknown as () => WebSocket)

      const result = await checkWebSocketService()
      expect(result.healthy).toBe(false)
    })
  })

  describe('checkTimerService', () => {
    it('should return healthy when timer service is active', () => {
      // Use Partial to satisfy the type without casting to unknown
      const mockTimer: Partial<TabataTimer> = {
        getState: jest.fn(() => ({} as any))
      }

      const result = checkTimerService(mockTimer as TabataTimer)
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })
})
