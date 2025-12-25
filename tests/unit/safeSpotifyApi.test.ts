import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { createSafeSpotifyApi } from '../../services/safeSpotifyApi'

// Mock the SpotifyApi player methods
const mockPlayer: jest.Mocked<SpotifyApi['player']> = {
  startResumePlayback: jest.fn(),
  pausePlayback: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  // Add other methods that might be called to prevent errors
  addItemToPlaybackQueue: jest.fn(),
  getAvailableDevices: jest.fn(),
  getCurrentlyPlayingTrack: jest.fn(),
  getPlaybackState: jest.fn(),
  getRecentlyPlayedTracks: jest.fn(),
  seekToPosition: jest.fn(),
  setPlaybackVolume: jest.fn(),
  setRepeatMode: jest.fn(),
  togglePlaybackShuffle: jest.fn(),
  transferPlayback: jest.fn(),
}

// A mock SDK instance
const mockSdk = {
  player: mockPlayer,
} as unknown as SpotifyApi

describe('createSafeSpotifyApi', () => {
  let safeSdk: SpotifyApi

  beforeEach(() => {
    jest.clearAllMocks()
    safeSdk = createSafeSpotifyApi(mockSdk)
  })

  it('should call startResumePlayback with deviceId when provided', async () => {
    const deviceId = 'test-device'
    await safeSdk.player.startResumePlayback(deviceId)
    expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith(deviceId)
  })

  it('should call startResumePlayback without deviceId when it is null', async () => {
    await safeSdk.player.startResumePlayback(null as unknown as string)
    expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith()
  })

  it('should call pausePlayback with deviceId when provided', async () => {
    const deviceId = 'test-device'
    await safeSdk.player.pausePlayback(deviceId)
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith(deviceId)
  })

  it('should call pausePlayback without deviceId when it is undefined', async () => {
    await safeSdk.player.pausePlayback(undefined as unknown as string)
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith()
  })

  it('should call skipToNext with deviceId when provided', async () => {
    const deviceId = 'test-device'
    await safeSdk.player.skipToNext(deviceId)
    expect(mockPlayer.skipToNext).toHaveBeenCalledWith(deviceId)
  })

  it('should call skipToNext without deviceId when it is an empty string', async () => {
    await safeSdk.player.skipToNext('')
    expect(mockPlayer.skipToNext).toHaveBeenCalledWith()
  })

  it('should call skipToPrevious with deviceId when provided', async () => {
    const deviceId = 'test-device'
    await safeSdk.player.skipToPrevious(deviceId)
    expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith(deviceId)
  })

  it('should call skipToPrevious without deviceId when it is not provided', async () => {
    await (safeSdk.player.skipToPrevious as unknown as () => Promise<void>)()
    expect(mockPlayer.skipToPrevious).toHaveBeenCalledWith()
  })
})
