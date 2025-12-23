// File: tests/unit/lib/healthCheck.test.ts
import {
  checkMemoryUsage,
  checkTimerService,
  checkWebSocketService,
  checkSpotifyAPI,
} from '../../../lib/healthCheck'
import TabataTimer from '../../../services/tabataTimer'
import { WebSocket } from 'ws'

jest.mock('ws')
const MockedWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>

describe('Health Check Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
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
        ok: true,
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
    it(
      'should return healthy when WebSocket connection is successful',
      async () => {
        MockedWebSocket.mockImplementation(function (this: WebSocket) {
          this.close = jest.fn()
          setTimeout(() => this.onopen && this.onopen(), 50)
          return this
        } as any)
        const result = await checkWebSocketService()
        expect(result.healthy).toBe(true)
      },
      30000
    )

    it(
      'should return unhealthy when WebSocket connection fails',
      async () => {
        MockedWebSocket.mockImplementation(function (this: WebSocket) {
          this.close = jest.fn()
          setTimeout(
            () => this.onerror && this.onerror(new Error('Connection failed')),
            50
          )
          return this
        } as any)
        const result = await checkWebSocketService()
        expect(result.healthy).toBe(false)
      },
      30000
    )
  })

  describe('checkTimerService', () => {
    it('should return healthy when timer service is active', () => {
      const mockTimer = {
        getState: jest.fn(),
      } as unknown as TabataTimer
      const result = checkTimerService(mockTimer)
      expect(result.healthy).toBe(true)
      expect(result.details.instance).toBe('active')
    })
  })
})
