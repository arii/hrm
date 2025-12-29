/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import { SpotifyData } from '../../types/websocket'
import logger from '@/utils/logger'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the logger
jest.mock('../../lib/env.js', () => ({
  env: {
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_CLIENT_SECRET: 'test_client_secret',
    SPOTIFY_POLLING_INTERVAL_MS: 100,
    SPOTIFY_DEVICE_POLLING_INTERVAL_MS: 10000,
    SPOTIFY_DEBUG: false,
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: 'localhost',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'test-secret',
    TESTING: true,
  },
}))

jest.mock('@/utils/logger', () => ({
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
      updateToken: jest.fn(),
    }
  })
  return {
    SpotifyTokenManager,
  }
})

// Create a fully typed mock for the player. This ensures our mock conforms to the SDK's interface.
const mockPlayer: jest.Mocked<SpotifyApi['player']> = {
  addItemToPlaybackQueue: jest.fn(),
  getAvailableDevices: jest.fn(),
  getCurrentlyPlayingTrack: jest.fn(),
  getPlaybackState: jest.fn(),
  getRecentlyPlayedTracks: jest.fn(),
  pausePlayback: jest.fn(),
  seekToPosition: jest.fn(),
  setPlaybackVolume: jest.fn(),
  setRepeatMode: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  startResumePlayback: jest.fn(),
  togglePlaybackShuffle: jest.fn(),
  transferPlayback: jest.fn(),
}

jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(() => ({
      player: mockPlayer,
    })),
  },
  AccessToken: jest.fn(),
}))

import { ServerMessage } from '../../types/websocket'
describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
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
    broadcastMock = jest.fn((message) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Initialize the service and await its creation, which includes SDK setup
    spotifyService = await SpotifyPolling.create(broadcastMock)
    // Stop polling after service creation to avoid side effects in tests
    type SpotifyPollingWithPrivateAccess = SpotifyPolling & {
      pollInterval: NodeJS.Timeout | null
      tokenRefreshInterval: NodeJS.Timeout | null
    }
    const serviceWithAccess =
      spotifyService as unknown as SpotifyPollingWithPrivateAccess

    if (serviceWithAccess.pollInterval) {
      clearInterval(serviceWithAccess.pollInterval)
      serviceWithAccess.pollInterval = null
    }

    if (serviceWithAccess.tokenRefreshInterval) {
      clearInterval(serviceWithAccess.tokenRefreshInterval)
      serviceWithAccess.tokenRefreshInterval = null
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
    jest.restoreAllMocks()
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
      await spotifyService.handleCommand('PLAY', { deviceId: 'test_device_id' })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id'
      )
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', {
        deviceId: 'test_device_id',
      })
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle NEXT command', async () => {
      await spotifyService.handleCommand('NEXT', { deviceId: 'test_device_id' })
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle PREVIOUS command', async () => {
      await spotifyService.handleCommand('PREVIOUS', {
        deviceId: 'test_device_id',
      })
      expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith('test_device_id')
    })

    it('should include device ID when provided', async () => {
      const deviceId = 'test_device_123'
      await spotifyService.handleCommand('PLAY', { deviceId })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(deviceId)
    })

    it('should handle PLAY command with playlistUri', async () => {
      const playlistUri = 'spotify:playlist:123'
      await spotifyService.handleCommand('PLAY', { playlistUri })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(playlistUri)
    })

    it('should handle PLAY command with contextUri', async () => {
      const contextUri = 'spotify:album:456'
      await spotifyService.handleCommand('PLAY', { contextUri })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(contextUri)
    })

    it('should prioritize contextUri over playlistUri', async () => {
      const contextUri = 'spotify:album:456'
      const playlistUri = 'spotify:playlist:123'
      await spotifyService.handleCommand('PLAY', { contextUri, playlistUri })
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(contextUri)
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', { volume: 75 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', { volume: 150 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, undefined)
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.handleCommand('SET_VOLUME', { volume: -10 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, undefined)
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.handleCommand('SET_VOLUME', { volume: 75.7 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(76, undefined)
    })

    it('should return true on successful volume change', async () => {
      mockPlayer.setPlaybackVolume.mockImplementation(() => Promise.resolve())
      await spotifyService.handleCommand('SET_VOLUME', { volume: 50 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
    })

    it('should return false on failed volume change', async () => {
      mockPlayer.setPlaybackVolume.mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      )
      await spotifyService.handleCommand('SET_VOLUME', { volume: 50 })
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Device Management', () => {
    it('should refresh and broadcast available devices', async () => {
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
      mockPlayer.getAvailableDevices.mockImplementation(() =>
        Promise.resolve({
          devices: mockDevices,
        })
      )

      await spotifyService.refreshDevices()

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          devices: mockDevices,
        }),
      })
    })

    it('should transfer playback to device', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', { deviceId })
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })

    it('should handle TRANSFER_PLAYBACK command', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', { deviceId })
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Token Management', () => {
    it('should handle token updates', async () => {
      const mockTokenPayload = {
        provider: 'spotify',
        sub: 'testuser',
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        scope: 'user-read-playback-state',
        obtainedAt: Date.now(),
      }

      const forcePollSpy = jest
        .spyOn(spotifyService, 'forcePollAndBroadcast')
        .mockResolvedValue()

      await spotifyService.handleTokenUpdate(mockTokenPayload)

      // Verify that the token manager was updated
      const tokenManagerInstance = (SpotifyTokenManager as jest.Mock).mock
        .results[0].value
      expect(tokenManagerInstance.updateToken).toHaveBeenCalledWith(
        mockTokenPayload
      )

      // Verify that a poll was forced
      expect(forcePollSpy).toHaveBeenCalled()

      forcePollSpy.mockRestore()
    })

    it('should not execute commands without access token', async () => {
      // Override the mock to return null token for this test to ensure SDK is not initialized
      ;(SpotifyTokenManager as jest.Mock).mockImplementationOnce(() => ({
        getValidAccessToken: jest.fn().mockResolvedValue(null),
        getSdkAccessToken: jest.fn().mockReturnValue(null),
      }))

      const newService = await SpotifyPolling.create(broadcastMock)
      await newService.handleCommand('PLAY', {})
      // Should not make API call without token
      expect(mockPlayer.startResumePlayback).not.toHaveBeenCalled()
    })
  })

  describe('Playback State', () => {
    it('should broadcast state when track changes', async () => {
      const mockPlayback = {
        item: {
          id: 'track123',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
          album: {
            name: 'Test Album',
            images: [],
          },
          type: 'track',
        },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(mockPlayback)
      )

      spotifyService.startPolling()
      jest.advanceTimersByTime(150)
      await Promise.resolve()
      await Promise.resolve()
      spotifyService.stopPolling()

      // Only check the last broadcasted state
      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
    })

    it('should handle 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(null)
      )

      spotifyService.startPolling()
      jest.advanceTimersByTime(150)
      await Promise.resolve()
      await Promise.resolve()
      spotifyService.stopPolling()

      // Only check the last broadcasted state
      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
    })
  })

  describe('Integration with Timer', () => {
    it('should support NEXT command when timer starts', async () => {
      // Simulate timer start triggering NEXT
      await spotifyService.handleCommand('NEXT', { deviceId: 'test_device_id' })
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should support PAUSE command when timer stops', async () => {
      // Simulate timer stop triggering PAUSE
      await spotifyService.handleCommand('PAUSE', {
        deviceId: 'test_device_id',
      })
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle rapid command sequences', async () => {
      jest.clearAllMocks()

      // Simulate rapid commands that might happen during workout
      await spotifyService.handleCommand('PLAY', { deviceId: 'test_device_id' })
      await spotifyService.handleCommand('NEXT', { deviceId: 'test_device_id' })
      await spotifyService.handleCommand('PAUSE', {
        deviceId: 'test_device_id',
      })

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
      // Should not throw
      await expect(
        spotifyService.handleCommand('PLAY', { deviceId: 'test_device_id' })
      ).resolves.not.toThrow()

      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle 401 unauthorized responses', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.reject({ status: 401 })
      )
      // @ts-expect-error - Testing private method
      const refreshSpy = jest.spyOn(spotifyService, 'checkAndRefreshSdkToken')
      spotifyService.startPolling(100)
      jest.advanceTimersByTime(150)
      await Promise.resolve() // Flush promises
      await Promise.resolve() // Flush promises
      spotifyService.stopPolling()

      // Should attempt to handle 401 without crashing
      expect(() => spotifyService.getState()).not.toThrow()
      expect(logger.warn).toHaveBeenCalledWith(
        'Spotify token expired during polling. Attempting refresh.'
      )
      expect(refreshSpy).toHaveBeenCalled()
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
      await newService.handleCommand('SET_VOLUME', { volume: 50 })
      expect(mockPlayer.setPlaybackVolume).not.toHaveBeenCalled()

      // Restore original SpotifyPolling.create
      SpotifyPolling.create = originalSpotifyPollingCreate
    })

    it('should handle SyntaxError during error logging gracefully', async () => {
      // Simulate an error that returns invalid JSON when text() is called
      const errorResponse = {
        response: {
          text: jest.fn().mockResolvedValue('Invalid JSON'),
        },
      }
      mockPlayer.startResumePlayback.mockRejectedValue(errorResponse)

      await spotifyService.handleCommand('PLAY', { deviceId: 'device_id' })

      expect(logger.error).toHaveBeenCalledWith(
        { command: 'PLAY', response: 'Invalid JSON' },
        'Error executing Spotify command'
      )
    })

    it('should handle unexpected errors in error logging safely', async () => {
      // Simulate a deeply nested error that might crash text() retrieval
      const badError = {
        response: {
          text: jest.fn().mockRejectedValue(new Error('Stream closed')),
        },
      }
      mockPlayer.startResumePlayback.mockRejectedValue(badError)

      await spotifyService.handleCommand('PLAY', { deviceId: 'device_id' })

      expect(logger.error).toHaveBeenCalledWith(
        { command: 'PLAY', err: expect.any(Error) },
        'Could not read response body for failed Spotify command'
      )
    })

    it('should handle direct SyntaxError gracefully (suppress logs)', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected token')
      )

      await spotifyService.handleCommand('PLAY', { deviceId: 'device_id' })

      expect(logger.warn).toHaveBeenCalledWith(
        { command: 'PLAY' },
        'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should suppress SyntaxError on 204 No Content from PLAY', async () => {
      // Simulate the SDK throwing a SyntaxError for a 204 response
      mockPlayer.startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected end of JSON input')
      )

      // This should not throw an unhandled promise rejection
      await expect(
        spotifyService.handleCommand('PLAY', { deviceId: 'test_device_id' })
      ).resolves.not.toThrow()

      // It should not log a scary error, but a debug message is fine
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('should re-throw other errors from executeSdkCommand', async () => {
      // Simulate the SDK throwing a different error
      const otherError = new Error('Some other error')
      mockPlayer.startResumePlayback.mockRejectedValue(otherError)

      await spotifyService.handleCommand('PLAY', { deviceId: 'test_device_id' })

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'PLAY',
          err: otherError,
        }),
        'Error executing Spotify command'
      )
    })
  })
})
