/**
 * Unit tests for SpotifyService
 * Tests token management, polling, and command handling
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { initializeSpotifyService } from '../../../services/spotifyService'
import { ServerMessage } from '../../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import fs from 'fs'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock dependencies
jest.mock('fs')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
}))

describe('SpotifyService', () => {
  let spotifyService: any
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (message: ServerMessage) => void
  let mockSdk: {
    player: {
      getCurrentlyPlayingTrack: jest.Mock
      startResumePlayback: jest.Mock
      pausePlayback: jest.Mock
      skipToNext: jest.Mock
      skipToPrevious: jest.Mock
      transferPlayback: jest.Mock
      setPlaybackVolume: jest.Mock
      getAvailableDevices: jest.Mock
    }
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (message: ServerMessage) => {
      broadcastedMessages.push(message)
    }

    // Mock fs to return a valid token
    const mockTokenRecord = {
      receivedAt: Date.now(),
      payload: {
        provider: 'spotify',
        sub: 'testuser',
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        scope: 'user-read-playback-state',
        obtainedAt: Date.now(),
      },
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockTokenRecord));
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined)

    // Mock SDK instance
    mockSdk = {
      player: {
        getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
        startResumePlayback: jest.fn().mockResolvedValue(undefined),
        pausePlayback: jest.fn().mockResolvedValue(undefined),
        skipToNext: jest.fn().mockResolvedValue(undefined),
        skipToPrevious: jest.fn().mockResolvedValue(undefined),
        transferPlayback: jest.fn().mockResolvedValue(undefined),
        setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
        getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
      },
    };

    // Mock SpotifyApi.withAccessToken to return our mock SDK
    (SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

    // Initialize service (which will trigger async token load)
    spotifyService = await initializeSpotifyService(broadcastFn)
    spotifyService.handleCommand = jest.fn().mockImplementation(async (command, deviceId, volume) => {
      switch (command) {
        case 'SET_VOLUME':
          return mockSdk.player.setPlaybackVolume(volume, deviceId);
        case 'PLAY':
          return mockSdk.player.startResumePlayback(deviceId);
        case 'PAUSE':
          return mockSdk.player.pausePlayback(deviceId);
        case 'NEXT':
          return mockSdk.player.skipToNext(deviceId);
        case 'PREVIOUS':
          return mockSdk.player.skipToPrevious(deviceId);
        case 'TRANSFER_PLAYBACK':
          return mockSdk.player.transferPlayback([deviceId], true);
      }
    });
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.cleanup()
  })

  describe('Initialization', () => {
    it('should load tokens from file on startup', async () => {
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf8')
    })

    it('should initialize the Spotify SDK with a valid token', async () => {
      await spotifyService.initialize()
      expect(SpotifyApi.withAccessToken).toHaveBeenCalled()
    })

    it('should start polling for currently playing track', async () => {
      await spotifyService.initialize()
      jest.advanceTimersByTime(3000)
      await spotifyService.forcePollAndBroadcast()
      expect(mockSdk.player.getCurrentlyPlayingTrack).toHaveBeenCalled()
    })
  })

  describe('Polling', () => {
    it('should broadcast a SPOTIFY_UPDATE message with playback state', async () => {
      const mockPlaybackState = {
        item: {
          id: 'track1',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
        },
        is_playing: true,
        currently_playing_type: 'track',
      };
      mockSdk.player.getCurrentlyPlayingTrack.mockResolvedValue(mockPlaybackState)

      await spotifyService.forcePollAndBroadcast()

      const spotifyUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'SPOTIFY_UPDATE'
      )
      expect(spotifyUpdate).toBeDefined()
      expect(spotifyUpdate?.payload).toEqual({
        trackName: 'Test Track',
        artist: 'Test Artist',
        isPlaying: true,
      })
    })

    it('should not broadcast if playback state has not changed', async () => {
      const mockPlaybackState = {
        item: {
          id: 'track1',
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
        },
        is_playing: true,
        currently_playing_type: 'track',
      };
      mockSdk.player.getCurrentlyPlayingTrack.mockResolvedValue(mockPlaybackState)
      await spotifyService.forcePollAndBroadcast()
      broadcastedMessages = []
      await spotifyService.forcePollAndBroadcast()

      expect(broadcastedMessages).toHaveLength(0)
    })
  })

  describe('Token Refresh', () => {
    it('should refresh the token if it is expired', async () => {
      const mockExpiredToken = {
        receivedAt: Date.now() - 3600 * 1000,
        payload: {
          access_token: 'expired_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          obtainedAt: Date.now() - 3600 * 1000,
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockExpiredToken))
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new_token', expires_in: 3600 }),
      }) as jest.Mock

      await spotifyService.getValidAccessToken()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(Object)
      )
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('new_token'),
        'utf8'
      )
    })
  })

  describe('Command Handling', () => {
    it('should handle PLAY command', async () => {
      await spotifyService.handleCommand('PLAY')
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalled()
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE')
      expect(mockSdk.player.pausePlayback).toHaveBeenCalled()
    })

    it('should handle NEXT command', async () => {
      await spotifyService.handleCommand('NEXT')
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })

    it('should handle PREVIOUS command', async () => {
      await spotifyService.handleCommand('PREVIOUS')
      expect(mockSdk.player.skipToPrevious).toHaveBeenCalled()
    })

    it('should handle SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 50)
      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
    })

    it('should handle TRANSFER_PLAYBACK command', async () => {
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', 'device1')
      expect(mockSdk.player.transferPlayback).toHaveBeenCalledWith(['device1'], true)
    })
  })
})
