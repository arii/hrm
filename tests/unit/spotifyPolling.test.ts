/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ServerMessage, SpotifyData } from '../../types/websocket'
import logger from '../../utils/logger'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock the SpotifyTokenManager module
jest.mock('../../services/spotifyTokenManager')

const mockSpotifyTokenManager = SpotifyTokenManager as jest.Mock

const mockPlayer = {
  getCurrentlyPlayingTrack: jest.fn<() => Promise<unknown>>(),
  startResumePlayback: jest.fn<(...args: unknown[]) => Promise<void>>(),
  pausePlayback: jest.fn<(...args: unknown[]) => Promise<void>>(),
  skipToNext: jest.fn<(...args: unknown[]) => Promise<void>>(),
  skipToPrevious: jest.fn<(...args: unknown[]) => Promise<void>>(),
  transferPlayback: jest.fn<(...args: unknown[]) => Promise<void>>(),
  setPlaybackVolume: jest.fn<(...args: unknown[]) => Promise<void>>(),
  getAvailableDevices: jest.fn<() => Promise<{ devices: unknown[] }>>(),
}

jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(() => ({
      player: mockPlayer,
    })),
  },
  AccessToken: jest.fn(),
}))

describe('SpotifyPolling Service', () => {
  let spotifyService: SpotifyPolling
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    // Reset mockPlayer's mocks before each test
    Object.values(mockPlayer).forEach((mockFn) => mockFn.mockClear())
    mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)
    mockPlayer.startResumePlayback.mockResolvedValue(undefined)
    mockPlayer.pausePlayback.mockResolvedValue(undefined)
    mockPlayer.skipToNext.mockResolvedValue(undefined)
    mockPlayer.skipToPrevious.mockResolvedValue(undefined)
    mockPlayer.transferPlayback.mockResolvedValue(undefined)
    mockPlayer.setPlaybackVolume.mockResolvedValue(undefined)
    mockPlayer.getAvailableDevices.mockResolvedValue({ devices: [] })

    broadcastedStates = []
    broadcastMock = jest.fn((message: ServerMessage) => {
      if (message.type === 'SPOTIFY_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_POLLING_INTERVAL_MS = '100' // Use a short interval for testing
    process.env.SPOTIFY_DEBUG = 'false' // Disable debug logging in tests

    mockSpotifyTokenManager.mockImplementation(() => ({
      getValidAccessToken: jest.fn().mockResolvedValue('mock_access_token'),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }))

    // Initialize the service and await its creation
    spotifyService = await SpotifyPolling.create(broadcastMock)
  })

  afterEach(() => {
    // Ensure polling is stopped and all timers are cleared
    spotifyService.cleanup()
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
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id'
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
      expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(deviceId)
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, 'test_device_id')
    })

    it('should clamp volume to 0-100 range', async () => {
      await spotifyService.handleCommand(
        'SET_VOLUME',
        'test_device_id',
        150
      )
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(100, 'test_device_id')
    })

    it('should clamp negative volume to 0', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', -10)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(0, 'test_device_id')
    })

    it('should round volume to nearest integer', async () => {
      await spotifyService.handleCommand(
        'SET_VOLUME',
        'test_device_id',
        75.7
      )
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(76, 'test_device_id')
    })
  })

  describe('Device Management', () => {
    it('should get available devices', async () => {
      const mockDevices = [
        { id: 'device1', name: 'Speaker', type: 'Speaker' },
        { id: 'device2', name: 'Phone', type: 'Smartphone' },
      ]
      mockPlayer.getAvailableDevices.mockResolvedValue({
        devices: mockDevices,
      })

      const devices = await spotifyService.getAvailableDevices()
      expect(devices).toHaveLength(2)
      if (devices[0]) {
        expect(devices[0].id).toBe('device1')
      }
      if (devices[1]) {
        expect(devices[1].id).toBe('device2')
      }
    })

    it('should transfer playback to device', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Token Management', () => {
    it('should accept refresh token signal', async () => {
      const initializeSdkSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(spotifyService as any, 'initializeSdk')
        .mockResolvedValue(undefined)
      spotifyService.setRefreshToken('test_refresh_token')
      await jest.advanceTimersByTimeAsync(1000)
      expect(initializeSdkSpy).toHaveBeenCalled()
      initializeSdkSpy.mockRestore()
    })

    it('should not execute commands if SDK is not initialized', async () => {
      // Create an instance without calling create() to simulate a failed init
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serviceWithoutSdk = new (SpotifyPolling as any)(broadcastMock)
      await serviceWithoutSdk.handleCommand('PLAY')
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
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(mockPlayback)

      spotifyService.startPolling()
      await jest.runOnlyPendingTimersAsync()
      spotifyService.stopPolling()

      const lastState = broadcastedStates.at(-1)
      expect(lastState?.trackName).toBe('Test Track')
    })

    it('should handle 204 No Content response', async () => {
      mockPlayer.getCurrentlyPlayingTrack.mockResolvedValue(null)

      spotifyService.startPolling()
      await jest.runOnlyPendingTimersAsync()
      spotifyService.stopPolling()

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

    it('should handle 401 unauthorized responses', async () => {
      const checkAndRefreshSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(spotifyService as any, 'checkAndRefreshSdkToken')
        .mockResolvedValue(undefined)
      mockPlayer.getCurrentlyPlayingTrack.mockRejectedValue({ status: 401 })

      spotifyService.startPolling()
      await jest.runOnlyPendingTimersAsync()
      spotifyService.stopPolling()

      expect(checkAndRefreshSpy).toHaveBeenCalled()
      checkAndRefreshSpy.mockRestore()
    })

    it('should handle SyntaxError during error logging gracefully', async () => {
      const errorResponse = {
        response: { text: jest.fn().mockResolvedValue('Invalid JSON') },
      }
      mockPlayer.startResumePlayback.mockRejectedValue(errorResponse)
      await spotifyService.handleCommand('PLAY', 'device_id')
      expect(logger.error).toHaveBeenCalledWith(
        { response: 'Invalid JSON' },
        'Error executing Spotify command PLAY: Response body:'
      )
    })

    it('should handle direct SyntaxError gracefully (suppress logs)', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(
        new SyntaxError('Unexpected token')
      )
      await spotifyService.handleCommand('PLAY', 'device_id')
      expect(logger.warn).toHaveBeenCalledWith(
        '[SpotifyPolling] Command PLAY executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.'
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })
})
