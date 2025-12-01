 
/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyData, ServerMessage } from '../../types/websocket'
import { spotifyApi } from '../../services/spotifyApi'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the entire spotifyApi service
jest.mock('../../services/spotifyApi', () => ({
  spotifyApi: {
    getSdk: jest.fn(),
    isReady: jest.fn(),
    signalTokenRefresh: jest.fn(),
  },
}))

// A type-safe way to access the mocked spotifyApi
const mockedSpotifyApi = spotifyApi as jest.Mocked<typeof spotifyApi>

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock player methods
const mockPlayer: { [key: string]: jest.Mock } = {
  getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
  startResumePlayback: jest.fn().mockResolvedValue(undefined),
  pausePlayback: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  transferPlayback: jest.fn().mockResolvedValue(undefined),
  setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
  getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
}

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    // Setup API mocks for each test
    mockedSpotifyApi.getSdk.mockResolvedValue({
      player: mockPlayer,
    } as unknown as SpotifyApi)
    mockedSpotifyApi.isReady.mockReturnValue(true)
    mockedSpotifyApi.signalTokenRefresh.mockResolvedValue()

    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    spotifyService = await SpotifyPolling.create(broadcastMock)
  })

  afterEach(() => {
    spotifyService.cleanup()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = spotifyService.getState()
      expect(state.trackName).toBe('Awaiting Login...')
    })
  })

  describe('Command Handling', () => {
    it('should handle PLAY command', async () => {
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id',
        undefined
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
  })

  describe('Token Management', () => {
    it('should signal token refresh', async () => {
      await spotifyService.setRefreshToken('new_token')
      expect(mockedSpotifyApi.signalTokenRefresh).toHaveBeenCalled()
    })

    it('should not execute commands if SDK is not ready', async () => {
      mockedSpotifyApi.getSdk.mockRejectedValue(new Error('SDK not ready'))
      await spotifyService.handleCommand('PLAY')
      expect(mockPlayer.startResumePlayback).not.toHaveBeenCalled()
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, 'test_device_id')
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 150)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, 'test_device_id')
    })
  })

  describe('Device Management', () => {
    it('should get available devices', async () => {
      const mockDevices = [{ id: 'device1', name: 'Speaker' }]
      mockPlayer.getAvailableDevices.mockResolvedValue({ devices: mockDevices })
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

  describe('Playback State', () => {
    it('should broadcast state when track changes', async () => {
      const mockPlayback = {
        item: {
          id: 'track123',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
        },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback)

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
    })

    it('should handle 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(
        new Error('Network error')
      )
      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()
      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
    })
  })
})
