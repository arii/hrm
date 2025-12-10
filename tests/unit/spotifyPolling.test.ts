/**
 * Unit tests for the SpotifyPolling service.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import { ServerMessage, SpotifyData } from '../../types/websocket'
import { SpotifyApi, PlaybackState } from '@spotify/web-api-ts-sdk'

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
}))

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]
  let mockPlayer: {
    getCurrentlyPlayingTrack: jest.Mock<() => Promise<PlaybackState | null>>
    startResumePlayback: jest.Mock<() => Promise<void>>
    pausePlayback: jest.Mock<() => Promise<void>>
    skipToNext: jest.Mock<() => Promise<void>>
    skipToPrevious: jest.Mock<() => Promise<void>>
    transferPlayback: jest.Mock<() => Promise<void>>
    setPlaybackVolume: jest.Mock<() => Promise<void>>
    getAvailableDevices: jest.Mock<() => Promise<{ devices: [] }>>
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    broadcastedStates = []
    broadcastMock = jest.fn((message: ServerMessage) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Mock the SpotifyTokenManager to provide a valid token
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
      }),
    }))

    // Mock the Spotify SDK player methods
    mockPlayer = {
      getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
      startResumePlayback: jest.fn().mockResolvedValue(undefined),
      pausePlayback: jest.fn().mockResolvedValue(undefined),
      skipToNext: jest.fn().mockResolvedValue(undefined),
      skipToPrevious: jest.fn().mockResolvedValue(undefined),
      transferPlayback: jest.fn().mockResolvedValue(undefined),
      setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
      getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
    }
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      player: mockPlayer,
    })

    spotifyService = await SpotifyPolling.create(broadcastMock)
    spotifyService.stopPolling() // Stop polling immediately after creation for controlled testing
  })

  afterEach(() => {
    spotifyService.cleanup()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with a default state', () => {
      const state = spotifyService.getState()
      expect(state.trackName).toBe('Awaiting Login...')
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('Command Handling', () => {
    it('should handle PLAY command with a deviceId', async () => {
      await spotifyService.handleCommand('PLAY', 'test_device_123')
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_123',
        undefined,
        undefined
      )
    })

    it('should handle PAUSE command with a deviceId', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_123')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_123')
    })

    it('should warn if PLAY command is sent without a deviceId', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      await spotifyService.handleCommand('PLAY')
      expect(mockPlayer.startResumePlayback).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Command 'PLAY' requires a deviceId, but none was provided."
        )
      )
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_123', 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        75,
        'test_device_123'
      )
    })

    it('should warn if SET_VOLUME is called without a deviceId', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Command 'SET_VOLUME' requires a deviceId, but none was provided."
        )
      )
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Device Management', () => {
    it('should refresh devices on GET_DEVICES command', async () => {
      const pollSpy = jest
        .spyOn(
          spotifyService as unknown as { pollPlaybackState: () => void },
          'pollPlaybackState'
        )
        .mockResolvedValue(undefined)
      await spotifyService.handleCommand('GET_DEVICES')
      expect(pollSpy).toHaveBeenCalled()
      pollSpy.mockRestore()
    })

    it('should transfer playback to a specified device', async () => {
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', 'new_device_id')
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith(
        ['new_device_id'],
        true
      )
    })
  })

  describe('Playback State Polling', () => {
    it('should broadcast a new state when the track changes', async () => {
      const mockPlayback = {
        item: {
          name: 'New Song',
          artists: [{ name: 'Artist' }],
          type: 'track',
        },
        is_playing: true,
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(
        mockPlayback as PlaybackState
      )

      await (
        spotifyService as unknown as { pollPlaybackState: () => void }
      ).pollPlaybackState() // Manually trigger a poll

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackName: 'New Song',
          artist: 'Artist',
          isPlaying: true,
        }),
      })
    })

    it('should broadcast "No Active Playback" when nothing is playing', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)
      await (
        spotifyService as unknown as { pollPlaybackState: () => void }
      ).pollPlaybackState()
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackName: 'No Active Playback',
          isPlaying: false,
        }),
      })
    })
  })
})
