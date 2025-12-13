/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import { SpotifyData } from '../../types/websocket'
import logger from '../../utils/logger'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock the SpotifyTokenManager module
jest.mock('../../services/spotifyTokenManager')

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

    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_POLLING_INTERVAL_MS = '100' // Use a short interval for testing
    process.env.SPOTIFY_DEBUG = 'false' // Disable debug logging in tests

    // NEW: Mock the static method directly
    ;(SpotifyTokenManager.getSystemAccessToken as jest.Mock).mockResolvedValue(
      'mock_access_token'
    )

    // Initialize the service and await its creation, which includes SDK setup
    spotifyService = await SpotifyPolling.create(broadcastMock)
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
      await spotifyService.handleCommand('PLAY', 'test_device_id') // Assuming a deviceId is passed
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

    it('should include device ID when provided', async () => {
      const deviceId = 'test_device_123'
      await spotifyService.handleCommand('PLAY', deviceId)
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        deviceId,
        undefined
      )
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 150)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, undefined)
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, -10)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, undefined)
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75.7)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(76, undefined)
    })

    it('should handle failed volume change', async () => {
      mockPlayer.setPlaybackVolume.mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      )
      await spotifyService.handleCommand('SET_VOLUME', undefined, 50)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(50, undefined)
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
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Token Management', () => {
    it('should not execute commands if SDK is not initialized', async () => {
      // Override the mock to return null token for this test
      ;(SpotifyTokenManager.getSystemAccessToken as jest.Mock).mockResolvedValue(
        null
      )

      // Create a new service instance which will fail to initialize the SDK
      const newService = await SpotifyPolling.create(broadcastMock)
      await newService.handleCommand('PLAY')

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
          type: 'track',
        },
        is_playing: true,
        currently_playing_type: 'track',
      }
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(mockPlayback)
      )

      spotifyService.startPolling()
      await jest.advanceTimersByTimeAsync(150)
      spotifyService.stopPolling()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
      expect(lastState?.isPlaying).toBe(true)
    })

    it('should handle 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.resolve(null)
      )

      spotifyService.startPolling()
      await jest.advanceTimersByTimeAsync(150)
      spotifyService.stopPolling()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Nothing is currently playing.')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayer.startResumePlayback.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )
      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()
    })

    it('should handle 401 unauthorized responses by stopping polling', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockImplementation(() =>
        Promise.reject({ status: 401 })
      )
      const stopPollingSpy = jest.spyOn(spotifyService, 'stopPolling')

      spotifyService.startPolling()
      await jest.advanceTimersByTimeAsync(150)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Spotify API returned 401')
      )
      expect(stopPollingSpy).toHaveBeenCalled()
    })
  })
})
