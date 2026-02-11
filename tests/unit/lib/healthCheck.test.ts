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
import { WebSocket } from 'ws'
import TabataTimer from '../../../services/tabataTimer'

// Mock the 'ws' module
jest.mock('ws')

// Mock global fetch
global.fetch = jest.fn() as unknown as typeof fetch

describe('Health Check Logic', () => {
  const MockedWebSocket = WebSocket as unknown as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    MockedWebSocket.mockClear()
  })

  describe('checkMemoryUsage', () => {
    // Store original implementation
    const originalMemoryUsage = process.memoryUsage

    afterEach(() => {
      // Restore original implementation after each test
      process.memoryUsage = originalMemoryUsage
    })

    it('should return healthy if memory usage is within limits', () => {
      // Mock process.memoryUsage to return 50MB used (well below 512MB limit)
      process.memoryUsage = jest.fn(() => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })) as unknown as () => NodeJS.MemoryUsage

      const result = checkMemoryUsage()
      expect(result.healthy).toBe(true)
      expect(result.details.usedMB).toBe(50)
    })

    it('should return unhealthy if memory usage exceeds limits', () => {
      // Mock process.memoryUsage to return 600MB used (above 512MB limit)
      process.memoryUsage = jest.fn(() => ({
        rss: 1024 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })) as unknown as () => NodeJS.MemoryUsage

      const result = checkMemoryUsage()
      expect(result.healthy).toBe(false)
      expect(result.details.usedMB).toBe(600)
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
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(() => this.onopen && this.onopen({} as any), 50)
        return this
      })
      const result = await checkWebSocketService()
      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy when WebSocket connection fails', async () => {
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(
          () => this.onerror && this.onerror({ error: new Error('Connection failed') } as any),
          50
        )
        return this
      })
      const result = await checkWebSocketService()
      expect(result.healthy).toBe(false)
    })
  })

  describe('checkTimerService', () => {
    it('should return healthy when timer service is active', () => {
      const mockTimer = { getState: () => ({}) } as unknown as TabataTimer
      const result = checkTimerService(mockTimer)
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })
})
