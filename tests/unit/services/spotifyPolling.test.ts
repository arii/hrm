/**
 * @jest-environment jsdom
 */
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { SpotifyPolling } from '../../../services/spotifyPolling'
import { SpotifyClient } from '../../../services/spotify/spotifyClient'
import { SpotifyData, ServerMessage } from '../../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the logger to keep test output clean
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock the centralized SpotifyClient
const mockGetSdk = jest.fn()
jest.mock('../../../services/spotify/spotifyClient', () => {
  return {
    SpotifyClient: jest.fn().mockImplementation(() => ({
      getSdk: mockGetSdk,
    })),
  }
})

// Mock the Spotify SDK's player object
const mockPlayer = {
  getCurrentlyPlayingTrack: jest.fn(),
  startResumePlayback: jest.fn(),
  pausePlayback: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  setPlaybackVolume: jest.fn(),
  getAvailableDevices: jest.fn(),
  transferPlayback: jest.fn(),
}

describe('SpotifyPolling Service (Refactored)', () => {
  let spotifyService: SpotifyPolling
  let mockSpotifyClient: SpotifyClient
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    const mockSdk = { player: mockPlayer } as unknown as SpotifyApi
    mockGetSdk.mockResolvedValue(mockSdk)

    mockSpotifyClient = new (SpotifyClient as jest.Mock<any>)(
      'mock-client-id',
      'mock-client-secret'
    )

    broadcastMock = jest.fn()
    spotifyService = new SpotifyPolling(broadcastMock, mockSpotifyClient)
  })

  afterEach(() => {
    spotifyService.cleanup()
    jest.useRealTimers()
  })

  it('initializes with a default state of "Awaiting Login..."', () => {
    const initialState = spotifyService.getState()
    expect(initialState.trackName).toBe('Awaiting Login...')
    expect(initialState.isPlaying).toBe(false)
  })

  describe('Polling Logic', () => {
    it('broadcasts a "No Active Playback" message when Spotify returns a 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)
      spotifyService.startPolling(1000)
      await jest.advanceTimersByTimeAsync(1000)

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: {
          trackName: 'No Active Playback',
          artist: '',
          isPlaying: false,
        },
      })
    })

    it('broadcasts the currently playing track information when a track is active', async () => {
      const mockPlayback = {
        item: {
          id: 'track123',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
        },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback as any)
      spotifyService.startPolling(1000)
      await jest.advanceTimersByTimeAsync(1000)

      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: {
          trackName: 'Test Track',
          artist: 'Test Artist',
          isPlaying: true,
        },
      })
    })

    it('only broadcasts when the track ID or playback state changes', async () => {
      const mockPlayback = {
        item: { id: 'track123', name: 'Test Track', artists: [{ name: 'Test Artist' }] },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback as any)

      spotifyService.startPolling(1000)
      await jest.advanceTimersByTimeAsync(1000) // First poll
      await jest.advanceTimersByTimeAsync(1000) // Second poll, same state

      expect(broadcastMock).toHaveBeenCalledTimes(1) // Should only broadcast once

      // Change playback state
      mockPlayback.is_playing = false
      await jest.advanceTimersByTimeAsync(1000) // Third poll
      expect(broadcastMock).toHaveBeenCalledTimes(2) // Should broadcast again
    })

    it('handles API errors during polling gracefully', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockRejectedValue(new Error('API Error'))
      spotifyService.startPolling(1000)

      await expect(jest.advanceTimersByTimeAsync(1000)).resolves.toBeUndefined()
      expect(broadcastMock).not.toHaveBeenCalled()
    })
  })

  describe('Command Handling', () => {
    it('handles the PLAY command correctly', async () => {
      await spotifyService.handleCommand('PLAY', 'device-123')
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('device-123', undefined)
    })

    it('handles the PAUSE command correctly', async () => {
      await spotifyService.handleCommand('PAUSE', 'device-123')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('device-123')
    })

    it('handles the NEXT command correctly', async () => {
      await spotifyService.handleCommand('NEXT', 'device-123')
      expect(mockPlayer.skipToNext).toHaveBeenCalledWith('device-123')
    })

    it('handles the PREVIOUS command correctly', async () => {
      await spotifyService.handleCommand('PREVIOUS', 'device-123')
      expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith('device-123')
    })

    it('handles the SET_VOLUME command, clamping values to the 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'device-123', 150)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, { device_id: 'device-123' })

      await spotifyService.handleCommand('SET_VOLUME', 'device-123', -10)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, { device_id: 'device-123' })
    })

    it('warns but does not throw if a required deviceId is missing', async () => {
      await spotifyService.handleCommand('PLAY')
      expect(mockPlayer.startResumePlayback).not.toHaveBeenCalled()
    })

    it('triggers a fast-poll after a command is executed', async () => {
      await spotifyService.handleCommand('PAUSE', 'device-123')
      expect(mockPlayer.pausePlayback).toHaveBeenCalled()

      // Fast-forward to just before the 500ms fast-poll timer
      await jest.advanceTimersByTimeAsync(499)
      expect(mockPlayer.getCurrentlyPlayingTrack).not.toHaveBeenCalled()

      // Fast-forward past the 500ms mark
      await jest.advanceTimersByTimeAsync(1)
      expect(mockPlayer.getCurrentlyPlayingTrack).toHaveBeenCalled()
    })
  })
})
