/**
 * Unit tests for SpotifyPolling Service
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyApiService } from '../../services/spotifyApi'
import { SpotifyData } from '../../types/websocket'
import logger from '../../utils/logger'
import { ServerMessage } from '../../types/websocket'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// --- Mocks for SpotifyApiService and SDK ---

const mockPlayer = {
  getCurrentlyPlayingTrack: jest.fn<() => Promise<any>>(),
  startResumePlayback: jest.fn<() => Promise<void>>(),
  pausePlayback: jest.fn<() => Promise<void>>(),
  skipToNext: jest.fn<() => Promise<void>>(),
  skipToPrevious: jest.fn<() => Promise<void>>(),
  transferPlayback: jest.fn<() => Promise<void>>(),
  setPlaybackVolume: jest.fn<() => Promise<void>>(),
  getAvailableDevices: jest.fn<() => Promise<any>>(),
}

const mockSdk = {
  player: mockPlayer,
}

// Mock the entire SpotifyApiService
jest.mock('../../services/spotifyApi', () => ({
  SpotifyApiService: {
    getInstance: jest.fn(() => ({
      getSdk: jest.fn(() => mockSdk),
      getTokenManager: jest.fn(() => ({
        refreshToken: jest.fn().mockResolvedValue(true),
      })),
    })),
  },
}))

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mockPlayer behavior for each test
    Object.values(mockPlayer).forEach((mockFn) => mockFn.mockResolvedValue(undefined))
    mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)
    mockPlayer.getAvailableDevices.mockResolvedValue({ devices: [] })

    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Create a new instance for each test
    spotifyService = SpotifyPolling.create(broadcastMock)
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = spotifyService.getState()
      expect(state.trackName).toBe('Awaiting Login...')
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('Command Handling', () => {
    it('should handle PLAY command', () => {
      spotifyService.handleCommand('PLAY', 'test_device_id')
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle PAUSE command', () => {
      spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should not execute commands if SDK is not available', () => {
      // Arrange: Mock getInstance to return a service with a null SDK
      ;(SpotifyApiService.getInstance as jest.Mock).mockReturnValueOnce({
        getSdk: () => null,
      })
      const serviceWithNoSdk = SpotifyPolling.create(broadcastMock)

      // Act
      serviceWithNoSdk.handleCommand('PLAY', 'test_device_id')

      // Assert
      expect(mockPlayer.startResumePlayback).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith('Cannot execute command: SDK not initialized.')
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', () => {
      spotifyService.handleCommand('SET_VOLUME', 'd_id', 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, 'd_id')
    })
  })

  describe('Device Management', () => {
    it('should get available devices', async () => {
        const mockDevices = [{ id: 'device1', name: 'Speaker' }]
        mockPlayer.getAvailableDevices.mockResolvedValue({ devices: mockDevices })

        const devices = await spotifyService.getAvailableDevices()

        expect(devices).toEqual(mockDevices)
        expect(mockPlayer.getAvailableDevices).toHaveBeenCalled()
    })

    it('should transfer playback to a device', () => {
        const deviceId = 'device123'
        spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
        expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Playback State Polling', () => {
    it('should broadcast state when track changes', async () => {
      const mockPlayback = {
        item: { id: 'track123', name: 'Test Track', artists: [{ name: 'Test Artist' }], type: 'track' },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback)

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
      expect(lastState?.artist).toBe('Test Artist')
      expect(lastState?.isPlaying).toBe(true)
    })

    it('should broadcast "Nothing playing" for 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      await spotifyService.forcePollAndBroadcast()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
      expect(lastState?.isPlaying).toBe(false)
    })

    // it('should attempt to refresh token on 401 error', async () => {
    //   const error = { status: 401, message: 'Unauthorized' }
    //   mockPlayer.getCurrentlyPlayingTrack.mockRejectedValue(error)

    //   const tokenManager = SpotifyApiService.getInstance().getTokenManager()

    //   await spotifyService.forcePollAndBroadcast()

    //   expect(logger.warn).toHaveBeenCalledWith('Spotify token expired during polling. Attempting refresh.')
    //   expect(tokenManager.refreshToken).toHaveBeenCalled()
    // })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully during command execution', async () => {
        const commandError = new Error('Spotify API Error')
        mockPlayer.startResumePlayback.mockRejectedValue(commandError)

        // The handleCommand is fire-and-forget, so we can't await it.
        // We just check that the logger was called.
        spotifyService.handleCommand('PLAY', 'test_device_id')

        // Allow the promise inside handleCommand to resolve/reject
        await new Promise(process.nextTick);

        expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
        expect(logger.error).not.toHaveBeenCalled() // The default logger in the catch block is not called, the specific one is
    })
  })
})
