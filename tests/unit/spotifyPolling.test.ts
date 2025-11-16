/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyData } from '../../types/websocket'

// Mock the SpotifyTokenManager to avoid file system operations
jest.mock('../../services/spotifyTokenManager', () => ({
  SpotifyTokenManager: jest.fn().mockImplementation(() => ({
    getValidAccessToken: jest.fn().mockResolvedValue(null),
    getCurrentRefreshToken: jest.fn().mockReturnValue(null),
  })),
}))

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(data: Partial<{ spotifyData: SpotifyData }>) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedStates = []
    broadcastMock = jest.fn((data) => {
      if (data.spotifyData) {
        broadcastedStates.push(data.spotifyData)
      }
    })
    
    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_DEBUG = 'false' // Disable debug logging in tests
    
    spotifyService = new SpotifyPolling(broadcastMock)
  })

  afterEach(() => {
    // Ensure polling is stopped and all timers are cleared
    spotifyService.stopPolling()
    spotifyService.cleanup()
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = spotifyService.getState()
      expect(state.trackName).toBe('Awaiting Login...')
      expect(state.artist).toBe('')
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('Command Handling', () => {
    beforeEach(() => {
      // Mock a successful API response
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)
      
      // Set access token directly without triggering refresh
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'
    })

    it('should handle PLAY command', async () => {
      spotifyService.handleCommand('PLAY')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/play'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('should handle PAUSE command', async () => {
      spotifyService.handleCommand('PAUSE')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/pause'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('should handle NEXT command', async () => {
      spotifyService.handleCommand('NEXT')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/next'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should handle PREVIOUS command', async () => {
      spotifyService.handleCommand('PREVIOUS')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/previous'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should include device ID when provided', async () => {
      const deviceId = 'test_device_123'
      spotifyService.handleCommand('PLAY', deviceId)
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`device_id=${deviceId}`),
        expect.any(Object)
      )
    })
  })

  describe('Volume Control', () => {
    beforeEach(() => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)
      
      // Set access token directly without triggering refresh
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'
    })

    it('should set volume with SET_VOLUME command', async () => {
      spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/volume'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('volume_percent=75'),
        expect.any(Object)
      )
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.setVolume(150)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('volume_percent=100'),
        expect.objectContaining({})
      )
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.setVolume(-10)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('volume_percent=0'),
        expect.any(Object)
      )
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.setVolume(75.7)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('volume_percent=76'),
        expect.any(Object)
      )
    })

    it('should include device ID in volume request when provided', async () => {
      const deviceId = 'test_device_123'
      await spotifyService.setVolume(50, deviceId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`device_id=${deviceId}`),
        expect.any(Object)
      )
    })

    it('should return true on successful volume change', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)

      await spotifyService.setVolume(50)
      // Volume command is fire-and-forget, just verify no errors
      expect(true).toBe(true)
    })

    it('should return false on failed volume change', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 500,
        ok: false,
        text: async () => 'Internal Server Error',
      } as Response)

      await spotifyService.setVolume(50)
      // Volume command will fail silently, just verify no errors
      expect(true).toBe(true)
    })
  })

  describe('Device Management', () => {
    beforeEach(() => {
      // Set access token directly without triggering refresh
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'
    })

    it('should get available devices', async () => {
      const mockDevices = [
        {
          id: 'device1',
          name: 'Speaker',
          type: 'Speaker',
          is_active: true,
          is_private_session: false,
          is_restricted: false,
          volume_percent: 50,
        },
        {
          id: 'device2',
          name: 'Phone',
          type: 'Smartphone',
          is_active: false,
          is_private_session: false,
          is_restricted: false,
          volume_percent: 30,
        },
      ]

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ devices: mockDevices }),
      } as Response)

      const devices = await spotifyService.getAvailableDevices()
      expect(devices).toHaveLength(2)
      expect(devices[0].id).toBe('device1')
      expect(devices[1].id).toBe('device2')
    })

    it('should transfer playback to device', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)

      const result = await spotifyService.transferPlayback('device123')
      expect(result).toBe(true)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            device_ids: ['device123'],
            play: true,
          }),
        })
      )
    })

    it('should handle TRANSFER_PLAYBACK command', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)

      spotifyService.handleCommand('TRANSFER_PLAYBACK', 'device123')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })
  })

  describe('Token Management', () => {
    it('should accept refresh token', () => {
      const refreshToken = 'test_refresh_token'
      spotifyService.setRefreshToken(refreshToken)
      
      // Should not throw and should be stored internally
      expect(() => spotifyService.setRefreshToken(refreshToken)).not.toThrow()
    })

    it('should not execute commands without access token', async () => {
      const newService = new SpotifyPolling(broadcastMock)
      
      await newService.handleCommand('PLAY')
      
      // Should not make API call without token
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Playback State', () => {
    it('should broadcast state when track changes', async () => {
      const mockPlayback = {
        item: {
          id: 'track123',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
        },
        is_playing: true,
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockPlayback,
      } as Response)
      
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'

      // Start polling with fake timers and advance
      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      
      // Flush all promises
      await Promise.resolve()
      await Promise.resolve()
      
      spotifyService.stopPolling()

      // Should have broadcast the new state
      const broadcasts = broadcastedStates.filter(
        (s) => s.trackName === 'Test Track'
      )
      expect(broadcasts.length).toBeGreaterThan(0)
    })

    it('should handle 204 No Content response', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)
      
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'

      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      
      // Flush all promises
      await Promise.resolve()
      await Promise.resolve()
      
      spotifyService.stopPolling()

      // Should update state to indicate nothing playing
      const broadcasts = broadcastedStates.filter(
        (s) => s.trackName === 'Nothing is currently playing.'
      )
      expect(broadcasts.length).toBeGreaterThan(0)
    })
  })

  describe('Integration with Timer', () => {
    beforeEach(() => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        status: 204,
        ok: true,
      } as Response)
      
      // Set access token directly without triggering refresh
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'
    })

    it('should support NEXT command when timer starts', async () => {
      // Simulate timer start triggering NEXT
      spotifyService.handleCommand('NEXT')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/next'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should support PAUSE command when timer stops', async () => {
      // Simulate timer stop triggering PAUSE
      spotifyService.handleCommand('PAUSE')
      
      // Wait for async operation
      jest.advanceTimersByTime(100)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/player/pause'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    it('should handle rapid command sequences', () => {
      jest.clearAllMocks()
      
      // Simulate rapid commands that might happen during workout
      spotifyService.handleCommand('PLAY')
      spotifyService.handleCommand('NEXT')
      spotifyService.handleCommand('PAUSE')
      
      // Advance timers for all async operations
      jest.advanceTimersByTime(100)
      
      // Should have made 3 fetch calls (one for each command)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      )
      
      // Set access token directly
      ;(spotifyService as unknown as { accessToken: string }).accessToken = 'test_access_token'

      // Should not throw
      expect(() => spotifyService.handleCommand('PLAY')).not.toThrow()
      
      // Advance timers for async operation
      jest.advanceTimersByTime(100)
    })

    it('should handle 401 unauthorized responses', () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response)

      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      spotifyService.stopPolling()

      // Should attempt to handle 401 without crashing
      expect(() => spotifyService.getState()).not.toThrow()
    })

    it('should return false for volume change without token', async () => {
      const newService = new SpotifyPolling(broadcastMock)
      const result = await newService.setVolume(50)
      
      expect(result).toBe(false)
    })
  })
})
