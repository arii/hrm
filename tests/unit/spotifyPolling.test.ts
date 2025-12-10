/**
 * Unit tests for SpotifyPolling service (refactored with centralized client)
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
const mockPlayer = {
  getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
  getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
  startResumePlayback: jest.fn().mockResolvedValue(undefined),
  pausePlayback: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  transferPlayback: jest.fn().mockResolvedValue(undefined),
  setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
}

const mockSdk = {
  player: mockPlayer,
}

jest.mock('../../services/spotifyClient', () => ({
  spotifyClient: {
    getSdk: jest.fn().mockResolvedValue(mockSdk),
    executeCommand: jest.fn(async (action, _commandName) => {
      try {
        await action(mockSdk as any)
        return true
      } catch (e) {
        return false
      }
    }),
  },
}))
import { SpotifyPolling } from '../../services/spotifyPolling'
import { spotifyClient } from '../../services/spotifyClient'
import { ServerMessage, SpotifyData } from '../../types/websocket'
import logger from '../../utils/logger'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('SpotifyPolling Service (Refactored)', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    process.env.SPOTIFY_POLLING_INTERVAL_MS = '100'

    spotifyService = await SpotifyPolling.create(broadcastMock)
    spotifyService.stopPolling() // Stop polling immediately after creation for controlled testing
  })

  afterEach(() => {
    spotifyService.stopPolling()
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('should initialize with default state', () => {
    const state = spotifyService.getState()
    expect(state.trackName).toBe('Awaiting Login...')
    expect(state.isPlaying).toBe(false)
  })

  describe('Polling Logic', () => {
    it('should poll for currently playing track and broadcast updates', async () => {
      const mockPlayback = {
        item: { id: 'track1', name: 'Test Track', artists: [{ name: 'Artist' }], type: 'track' },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback)

      spotifyService.startPolling()
      await jest.advanceTimersByTimeAsync(150)

      expect(spotifyClient.getSdk).toHaveBeenCalled()
      expect(mockPlayer.getCurrentlyPlayingTrack).toHaveBeenCalled()
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
          trackName: 'Test Track',
          artist: 'Artist',
          isPlaying: true,
        }),
      })
    })

    it('should handle empty playback state (204 No Content)', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      spotifyService.startPolling()
      await jest.advanceTimersByTimeAsync(150)

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
      expect(lastState?.isPlaying).toBe(false)
    })
  })

  describe('Command Handling', () => {
    it('should delegate commands to spotifyClient.executeCommand', async () => {
      await spotifyService.handleCommand('PLAY', 'device1', 100, 'spotify:playlist:123')
      expect(spotifyClient.executeCommand).toHaveBeenCalledWith(expect.any(Function), 'PLAY')

      // Check if the correct SDK method was called inside the action
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('device1', 'spotify:playlist:123')
    })

    it('should refresh devices directly without delegating', async () => {
      const mockDevices = [{ id: 'device1', name: 'Speaker', type: 'Speaker' }]
      mockPlayer.getAvailableDevices.mockResolvedValue({ devices: mockDevices })

      await spotifyService.handleCommand('GET_DEVICES')

      expect(spotifyClient.executeCommand).not.toHaveBeenCalled()
      expect(spotifyClient.getSdk).toHaveBeenCalled()
      expect(mockPlayer.getAvailableDevices).toHaveBeenCalled()
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'SPOTIFY_UPDATE',
        payload: expect.objectContaining({
            devices: expect.arrayContaining([expect.objectContaining({id: 'device1'})]),
        }),
      })
    })

    it('should trigger an optimistic poll after a successful command', async () => {
        jest.clearAllMocks()
        ;(spotifyClient.executeCommand as jest.Mock).mockResolvedValue(true)

        await spotifyService.handleCommand('NEXT')

        // Should be called almost immediately
        await jest.advanceTimersByTimeAsync(550)

        expect(spotifyClient.executeCommand).toHaveBeenCalledWith(expect.any(Function), 'NEXT')
        expect(mockPlayer.skipToNext).toHaveBeenCalledWith(undefined) // Check action was called

        // Check that a poll was triggered
        expect(spotifyClient.getSdk).toHaveBeenCalledTimes(1)
        expect(mockPlayer.getCurrentlyPlayingTrack).toHaveBeenCalledTimes(1)
    });
  })
})
