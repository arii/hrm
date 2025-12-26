/**
 * @jest-environment node
 */
import { jest } from '@jest/globals'
import {
  checkMemoryUsage,
  checkSpotifyAPI,
  checkWebSocketService,
  checkTimerService,
  checkRedis,
} from '../../../lib/healthCheck'
import { WebSocket } from 'ws'
import TabataTimer from '../../../services/tabataTimer'

// Mock the 'ws' module
jest.mock('ws')
jest.mock('../../../lib/redis.js')

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
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(() => this.onopen && this.onopen(), 50)
        return this
      })
      const result = await checkWebSocketService()
      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy when WebSocket connection fails', async () => {
      MockedWebSocket.mockImplementation(function (this: WebSocket) {
        this.close = jest.fn()
        setTimeout(
          () => this.onerror && this.onerror(new Error('Connection failed')),
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
      const mockTimer = { getState: () => ({}) } as TabataTimer
      const result = checkTimerService(mockTimer)
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })

  describe('checkRedis', () => {
    it('should return healthy when redis is connected', async () => {
      const result = await checkRedis()
      expect(result.healthy).toBe(true)
      expect(result.status).toBe('connected')
    })
  })
})
