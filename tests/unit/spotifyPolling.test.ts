/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import { SpotifyData } from '../../types/websocket'
import logger from '@/utils/logger'

// Mock the logger
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

import { ServerMessage } from '../../types/websocket'
describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset mockPlayer's mocks
    Object.values(mockPlayer).forEach((mock) => mock.mockClear())
    mockPlayer.getAvailableDevices.mockResolvedValue({ devices: [] })

    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_POLLING_INTERVAL_MS = '100' // Use a short interval for testing
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
    it('should initialize with default state but immediately poll and update', async () => {
      // The initial state is 'Awaiting Login...', but the immediate poll after creation
      // will update it to 'Nothing is currently playing.' because the mock returns null.
      await jest.runOnlyPendingTimersAsync() // Let the first poll complete
      const state = spotifyService.getState()
      expect(state.trackName).toBe('Nothing is currently playing.')
    })
  })

  describe('Command Handling', () => {
    it('should handle PLAY command without playlist', async () => {
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id'
      )
    })

    it('should handle PLAY command with playlist', async () => {
      await spotifyService.handleCommand(
        'PLAY',
        'test_device_id',
        undefined,
        'spotify:playlist:123'
      )
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id',
        'spotify:playlist:123'
      )
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
    })

    it('should handle failed volume change gracefully', async () => {
      mockPlayer.setPlaybackVolume.mockRejectedValue(new Error('API Error'))
      await spotifyService.handleCommand('SET_VOLUME', undefined, 50)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
      // The error should be caught and logged, not thrown.
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(new Error('Network error'))
      // The method now returns a promise that should not be rejected
      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()
      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle SyntaxError in response logging', async () => {
      const errorResponse = {
        response: { text: jest.fn().mockResolvedValue('Invalid JSON') },
      }
      mockPlayer.startResumePlayback.mockRejectedValue(errorResponse)
      await spotifyService.handleCommand('PLAY', 'device_id')
      expect(logger.error).toHaveBeenCalledWith(
        { command: 'PLAY', response: 'Invalid JSON' },
        'Error executing Spotify command'
      )
    })

    it('should handle unexpected errors during response logging', async () => {
      const badError = {
        response: {
          text: jest.fn().mockRejectedValue(new Error('Stream closed')),
        },
      }
      mockPlayer.startResumePlayback.mockRejectedValue(badError)
      await spotifyService.handleCommand('PLAY', 'device_id')
      expect(logger.error).toHaveBeenCalledWith(
        { command: 'PLAY', err: expect.any(Error) },
        'Could not read response body for failed Spotify command'
      )
    })

    it('should suppress direct SyntaxErrors from commands', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected token')
      )
      await spotifyService.handleCommand('PLAY', 'device_id')
      expect(logger.warn).toHaveBeenCalledWith(
        { command: 'PLAY' },
        'Command executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })
})
