/**
 * Unit tests for Spotify integration with timer
 * Tests Spotify commands and volume control
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { spotifyService } from '../../../services/spotifyService'
import { SpotifyData, ServerMessage } from '../../../types/websocket'
import logger from '../../../utils/logger'

// Mock fs to simulate a token file, so the service initializes the SDK
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(
    JSON.stringify({
      receivedAt: Date.now(),
      payload: {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        obtainedAt: Date.now(),
      },
    })
  ),
  writeFileSync: jest.fn(),
}))

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

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

describe('SpotifyService', () => {
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: SpotifyData[]

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

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

    process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    process.env.SPOTIFY_POLLING_INTERVAL_MS = '100'
    process.env.SPOTIFY_DEBUG = 'false'

    // Force the singleton to re-initialize with our test mocks and env vars
    // by calling a public method that triggers the internal `initializeSdk`
    spotifyService.setRefreshToken('fake_token_for_test_init');
    jest.runAllTimers(); // Flushes the setTimeout in setRefreshToken
    await Promise.resolve(); // Flushes promises to ensure async initializeSdk completes
  })

  afterEach(() => {
    spotifyService.stopPolling()
    spotifyService.cleanup()
    jest.clearAllTimers()
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
      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockPlayer.pausePlayback).toHaveBeenCalled()
    })

    it('should handle NEXT command', async () => {
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      expect(mockPlayer.skipToNext).toHaveBeenCalled()
    })

    it('should handle PREVIOUS command', async () => {
      await spotifyService.handleCommand('PREVIOUS', 'test_device_id')
      expect(mockPlayer.skipToPrevious).toHaveBeenCalled()
    })
  })

  describe('Volume Control', () => {
    it('should set volume with SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalledWith(75, undefined)
    })
  })

  describe('Device Management', () => {
    it('should get available devices', async () => {
       const mockDevices = [{ id: 'device1' }, { id: 'device2' }];
       mockPlayer.getAvailableDevices.mockResolvedValue({ devices: mockDevices });
       const devices = await spotifyService.getAvailableDevices();
       expect(devices).toHaveLength(2);
       expect(devices[0].id).toBe('device1');
    })

    it('should transfer playback to device', async () => {
      const deviceId = 'device123'
      await spotifyService.handleCommand('TRANSFER_PLAYBACK', deviceId)
      expect(mockPlayer.transferPlayback).toHaveBeenCalledWith([deviceId], true)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockPlayer.startResumePlayback.mockRejectedValue(new Error('Network error'))
      await expect(
        spotifyService.handleCommand('PLAY', 'test_device_id')
      ).resolves.not.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
