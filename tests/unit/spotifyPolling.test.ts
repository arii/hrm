/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyData } from '../../types/websocket'

// Mock the SpotifyTokenManager module
jest.mock('../../services/spotifyTokenManager', () => {
  const SpotifyTokenManager = jest.fn().mockImplementation(() => {
    return {
      getValidAccessToken: jest
        .fn()
        .mockImplementation(() => Promise.resolve('mock_access_token')),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }
  })
  return {
    SpotifyTokenManager,
  }
})

const mockPlayer: { [key: string]: jest.Mock } = {
  getCurrentlyPlayingTrack: jest
    .fn()
    .mockImplementation(() => Promise.resolve(null)),
  startResumePlayback: jest.fn().mockImplementation(() => Promise.resolve()),
  pausePlayback: jest.fn().mockImplementation(() => Promise.resolve()),
  skipToNext: jest.fn().mockImplementation(() => Promise.resolve()),
  skipToPrevious: jest.fn().mockImplementation(() => Promise.resolve()),
  transferPlayback: jest.fn().mockImplementation(() => Promise.resolve()),
  setPlaybackVolume: jest.fn().mockImplementation(() => Promise.resolve()),
  getAvailableDevices: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ devices: [] })),
}

jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(() => ({
      player: mockPlayer,
    })),
  },
  AccessToken: jest.fn(),
}))

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<
    (data: Partial<{ spotifyData: SpotifyData }>) => void
  >
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset mockPlayer's mocks
    mockPlayer.getCurrentlyPlayingTrack.mockClear()
    mockPlayer.startResumePlayback.mockClear()
    mockPlayer.pausePlayback.mockClear()
    mockPlayer.skipToNext.mockClear()
    mockPlayer.skipToPrevious.mockClear()
    mockPlayer.transferPlayback.mockClear()
    mockPlayer.setPlaybackVolume.mockClear()
    mockPlayer.getAvailableDevices.mockClear()
    mockPlayer.getAvailableDevices.mockResolvedValue({ devices: [] })

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

    // Initialize the service and await its creation, which includes SDK setup
    spotifyService = await SpotifyPolling.create(broadcastMock)
  })

  afterEach(() => {
    // Ensure polling is stopped and all timers are cleared
    if (spotifyService) {
      spotifyService.cleanup()
    }
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
    it('should handle PLAY command', async () => {
      await spotifyService.handleCommand('PLAY', 'test_device_id') // Assuming a deviceId is passed
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id'
      )
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle NEXT command', async () => {
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle PREVIOUS command', async () => {
      await spotifyService.handleCommand('PREVIOUS', 'test_device_id')
      expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith('test_device_id')
    })

    it('should include device ID when provided', async () => {
      const deviceId = 'test_device_123'
      await spotifyService.handleCommand('PLAY', deviceId)
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(deviceId)
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 150)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, undefined)
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, -10)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, undefined)
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75.7)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(76, undefined)
    })
  })

  describe('Device Management', () => {
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
      ]
      mockPlayer.getAvailableDevices.mockImplementation(() =>
        Promise.resolve({
          devices: mockDevices,
        })
      )

      const devices = await spotifyService.getAvailableDevices()
      expect(devices).toHaveLength(1)
      expect(devices[0].id).toBe('device1')
    })

    it('should transfer playback to device', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Token Management', () => {
    it('should accept refresh token signal', async () => {
      const initializeSdkSpy = jest
        .spyOn(spotifyService as any, 'initializeSdk')
        .mockResolvedValue(undefined)
      spotifyService.setRefreshToken('signal')
      jest.advanceTimersByTime(2000) // Small delay for async operation
      await Promise.resolve() // Flush promises
      expect(initializeSdkSpy).toHaveBeenCalled()
      initializeSdkSpy.mockRestore()
    })
  })

  describe('Playback State', () => {
    it('should broadcast state when track changes', async () => {
      const mockPlayback = {
        item: {
          id: 'track123',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Test Album', images: [{ url: 'test_url' }] },
          duration_ms: 180000,
          type: 'track',
        },
        progress_ms: 60000,
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(mockPlayback)
      )

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
      expect(lastState?.artist).toBe('Test Artist')
      expect(lastState?.isPlaying).toBe(true)
    })

    it('should handle 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(null)
      )

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
    })
  })

  describe('Integration with Timer', () => {
    it('should support NEXT command when timer starts', async () => {
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should support PAUSE command when timer stops', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle rapid command sequences', async () => {
      jest.clearAllMocks()

      // Simulate rapid commands that might happen during workout
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      await spotifyService.handleCommand('PAUSE', 'test_device_id')

      // Should have made 3 calls to the player methods
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledTimes(1)
      expect(mockPlayer.skipToNext).toHaveBeenCalledTimes(1)
      expect(mockPlayer.pausePlayback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayer.startResumePlayback.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()
    })

    it('should handle 401 unauthorized responses', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.reject({ status: 401 })
      )
      await spotifyService.forcePollAndBroadcast()
      expect(() => spotifyService.getState()).not.toThrow()
    })

    it('should not execute commands without access token', async () => {
      // Mock SpotifyPolling.create to return an instance with a null SDK
      const originalSpotifyPollingCreate = SpotifyPolling.create
      SpotifyPolling.create = jest.fn().mockResolvedValue({
        handleCommand: jest.fn(() => Promise.resolve()), // Mock handleCommand to return a resolved promise
        getState: jest.fn(),
        stopPolling: jest.fn(),
        cleanup: jest.fn(),
        initializeSdk: jest.fn(),
        setRefreshToken: jest.fn(),
        startPolling: jest.fn(),
        getAvailableDevices: jest.fn(),
        sdk: null, // Ensure SDK is null
      })

      const newService = await SpotifyPolling.create(broadcastMock)
      await newService.handleCommand('SET_VOLUME', undefined, 50)
      expect(mockPlayer.setPlaybackVolume).not.toHaveBeenCalled()

      // Restore original SpotifyPolling.create
      SpotifyPolling.create = originalSpotifyPollingCreate
    })

    it('should handle direct SyntaxError gracefully (suppress logs)', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      mockPlayer.startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected token')
      )

      await spotifyService.handleCommand('PLAY', 'test_device_id')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[SpotifyPolling] Command PLAY executed, but response was not valid JSON'
        )
      )
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})
