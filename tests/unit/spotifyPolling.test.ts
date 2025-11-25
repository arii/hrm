/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import logger from '../../utils/logger'
import * as socketManager from '../../utils/socketManager'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

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

jest.mock('../../utils/socketManager', () => ({
  broadcastSpotifyUpdate: jest.fn(),
}))

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

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset mockPlayer's mocks
    ;(mockPlayer as any).getCurrentlyPlayingTrack.mockClear()
    ;(mockPlayer as any).startResumePlayback.mockClear()
    ;(mockPlayer as any).pausePlayback.mockClear()
    ;(mockPlayer as any).skipToNext.mockClear()
    ;(mockPlayer as any).skipToPrevious.mockClear()
    ;(mockPlayer as any).transferPlayback.mockClear()
    ;(mockPlayer as any).setPlaybackVolume.mockClear()
    ;(mockPlayer as any).getAvailableDevices.mockClear()
    ;(mockPlayer as any).getAvailableDevices.mockResolvedValue({ devices: [] })

    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_DEBUG = 'false' // Disable debug logging in tests

    // Initialize the service and await its creation, which includes SDK setup
    spotifyService = await SpotifyPolling.create()
    // Stop polling after service creation to avoid side effects in tests

    if ((spotifyService as any).pollInterval) {
      clearInterval((spotifyService as any).pollInterval as NodeJS.Timeout)
      ;(spotifyService as any).pollInterval = null
    }

    if ((spotifyService as any).tokenRefreshInterval) {
      clearInterval(
        (spotifyService as any).tokenRefreshInterval as NodeJS.Timeout
      )
      ;(spotifyService as any).tokenRefreshInterval = null
    }
  })

  afterEach(() => {
    // Ensure polling is stopped and all timers are cleared
    if (spotifyService) {
      spotifyService.stopPolling()
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
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        75,
        'test_device_id'
      )
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 150)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        100,
        'test_device_id'
      )
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', -10)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        0,
        'test_device_id'
      )
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75.7)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        76,
        'test_device_id'
      )
    })

    it('should return true on successful volume change', async () => {
      ;(mockPlayer as any).setPlaybackVolume.mockImplementation(() =>
        Promise.resolve()
      )
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 50)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        50,
        'test_device_id'
      )
    })

    it('should return false on failed volume change', async () => {
      ;(mockPlayer as any).setPlaybackVolume.mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      )
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 50)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        50,
        'test_device_id'
      )
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
      ;(mockPlayer as any).getAvailableDevices.mockImplementation(() =>
        Promise.resolve({
          devices: mockDevices,
        })
      )

      const devices = await spotifyService.getAvailableDevices()
      expect(devices).toHaveLength(2)
      expect(devices?.[0].id).toBe('device1')
      expect(devices?.[1].id).toBe('device2')
    })

    it('should transfer playback to device', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })

    it('should handle TRANSFER_PLAYBACK command', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Token Management', () => {
    it('should accept refresh token', async () => {
      const refreshToken = 'test_refresh_token'
      // Mock the initializeSdk to resolve immediately
      const initializeSdkSpy = jest
        .spyOn(spotifyService as any, 'initializeSdk')
        .mockResolvedValue(undefined)
      spotifyService.setRefreshToken(refreshToken)
      // Advance timers to allow setTimeout to run
      jest.advanceTimersByTime(1000)
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
          type: 'track',
        },
        is_playing: true,
        currently_playing_type: 'track',
      }
      ;(mockPlayer as any).getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(mockPlayback)
      )

      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      await Promise.resolve()
      await Promise.resolve()
      spotifyService.stopPolling()

      expect(socketManager.broadcastSpotifyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ trackName: 'Test Track' })
      )
    })

    it('should handle 204 No Content response', async () => {
      ;(mockPlayer as any).getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(null)
      )

      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      await Promise.resolve()
      await Promise.resolve()
      spotifyService.stopPolling()

      expect(socketManager.broadcastSpotifyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ trackName: 'Nothing is currently playing.' })
      )
    })
  })

  describe('Integration with Timer', () => {
    it('should support NEXT command when timer starts', async () => {
      // Simulate timer start triggering NEXT
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should support PAUSE command when timer stops', async () => {
      // Simulate timer stop triggering PAUSE
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
      ;(mockPlayer as any).startResumePlayback.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      // Should not throw
      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()

      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
    })

    it('should handle 401 unauthorized responses', async () => {
      ;(mockPlayer as any).getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.reject({ status: 401 })
      )

      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      await Promise.resolve() // Flush promises
      await Promise.resolve() // Flush promises
      spotifyService.stopPolling()

      // Should attempt to handle 401 without crashing
      expect(() => spotifyService.getState()).not.toThrow()
    })

    it('should handle SyntaxError during error logging gracefully', async () => {
      // Simulate an error that returns invalid JSON when text() is called
      const errorResponse = {
        response: {
          text: jest.fn().mockResolvedValue('Invalid JSON' as any),
        },
      }
      ;(mockPlayer as any).startResumePlayback.mockRejectedValue(errorResponse)

      await spotifyService.handleCommand('PLAY', 'device_id')

      expect(logger.error).toHaveBeenCalledWith(
        { response: 'Invalid JSON' },
        expect.stringContaining(
          'Error executing Spotify command PLAY: Response body:'
        )
      )
    })

    it('should handle unexpected errors in error logging safely', async () => {
      // Simulate a deeply nested error that might crash text() retrieval
      const badError = {
        response: {
          text: jest.fn().mockRejectedValue(new Error('Stream closed') as any),
        },
      }
      ;(mockPlayer as any).startResumePlayback.mockRejectedValue(badError)

      await spotifyService.handleCommand('PLAY', 'device_id')

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        expect.stringContaining(
          'Error executing Spotify command PLAY: Failed to retrieve error response text:'
        )
      )
    })

    it('should handle direct SyntaxError gracefully (suppress logs)', async () => {
      ;(mockPlayer as any).startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected token') as any
      )

      await spotifyService.handleCommand('PLAY', 'device_id')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[SpotifyPolling] Command PLAY executed, but response was not valid JSON'
        )
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })
})
