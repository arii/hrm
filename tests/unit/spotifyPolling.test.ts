
/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyData } from '../../types/websocket'
import logger from '../../utils/logger'
import { SpotifyApiService } from '../../services/spotifyApiService'

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

jest.mock('../../services/spotifyApiService')

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<
    (data: Partial<{ spotifyData: SpotifyData }>) => void
  >
  let broadcastedStates: SpotifyData[]
  let mockApiService: jest.Mocked<SpotifyApiService>

  beforeEach(async () => {
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
    await spotifyService.initialize()

    // Replace the apiService instance with a mock
    mockApiService = new (SpotifyApiService as any)()
    ;(spotifyService as any).apiService = mockApiService
  })

  afterEach(() => {
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
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      expect(mockApiService.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id',
        undefined
      )
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockApiService.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle NEXT command', async () => {
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      expect(mockApiService.skipToNext).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle PREVIOUS command', async () => {
      await spotifyService.handleCommand('PREVIOUS', 'test_device_id')
      expect(mockApiService.skipToPrevious).toHaveBeenCalledWith('test_device_id')
    })

    it('should include device ID when provided', async () => {
      const deviceId = 'test_device_123'
      await spotifyService.handleCommand('PLAY', deviceId)
      expect(mockApiService.startResumePlayback).toHaveBeenCalledWith(
        deviceId,
        undefined
      )
    })
  })
})
