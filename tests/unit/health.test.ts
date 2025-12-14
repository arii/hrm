/**
 * @jest-environment node
 */
import {
  checkMemoryUsage,
  checkSpotifyAPI,
  checkTimerService,
  checkWebSocketService,
} from '@/lib/healthChecks'

// Mock dependencies
jest.mock('@/utils/socketManager', () => ({
  tabataTimer: {},
}))

global.fetch = jest.fn()

// Mock WebSocket
const mockWebSocket = {
  close: jest.fn(),
  onopen: jest.fn(),
  onerror: jest.fn(),
  on: jest.fn(),
  terminate: jest.fn(),
}
jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => mockWebSocket)
})

describe('Health Check Functions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('checkMemoryUsage', () => {
    it('should return healthy when memory usage is below the limit', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 256 * 1024 * 1024, // 256MB
        external: 0,
        arrayBuffers: 0,
      })
      const result = checkMemoryUsage()
      expect(result.healthy).toBe(true)
      expect(result.details.usedMB).toBe(256)
    })

    it('should return unhealthy when memory usage is above the limit', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 600 * 1024 * 1024, // 600MB
        external: 0,
        arrayBuffers: 0,
      })
      const result = checkMemoryUsage()
      expect(result.healthy).toBe(false)
      expect(result.details.usedMB).toBe(600)
    })
  })

  describe('checkWebSocketService', () => {
    it('should return healthy when WebSocket connection is successful', async () => {
      const resultPromise = checkWebSocketService()
      // Manually trigger the onopen event
      const onOpenCallback = mockWebSocket.onopen
      if (onOpenCallback) {
        onOpenCallback()
      }
      const result = await resultPromise
      expect(result.healthy).toBe(true)
      expect(result.details.service).toBe('websocket')
    })

    it('should return unhealthy when WebSocket connection fails', async () => {
      const resultPromise = checkWebSocketService()
      // Manually trigger the onerror event
      const onErrorCallback = mockWebSocket.onerror
      if (onErrorCallback) {
        onErrorCallback()
      }
      const result = await resultPromise
      expect(result.healthy).toBe(false)
      expect(result.details.service).toBe('websocket')
    })

    it('should return unhealthy on timeout', async () => {
      jest.useFakeTimers()
      const resultPromise = checkWebSocketService()
      jest.runAllTimers()
      const result = await resultPromise
      expect(result.healthy).toBe(false)
      expect(result.details.service).toBe('websocket')
      jest.useRealTimers()
    })
  })

  describe('checkSpotifyAPI', () => {
    it('should return healthy when Spotify API is reachable (401)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
      })
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(true)
      expect(result.details.status).toBe(401)
    })

    it('should return unhealthy when Spotify API returns other status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        status: 500,
      })
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(false)
      expect(result.details.status).toBe(500)
    })

    it('should return unhealthy on network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      const result = await checkSpotifyAPI()
      expect(result.healthy).toBe(false)
      expect(result.details.error).toBe('Network error')
    })
  })

  describe('checkTimerService', () => {
    it('should return healthy when timer service instance is active', () => {
      const result = checkTimerService()
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })
})
