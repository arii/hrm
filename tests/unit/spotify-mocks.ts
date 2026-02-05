import { jest } from '@jest/globals'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Fully typed mock for the SpotifyApi['player']
export const mockPlayer = {
  addItemToPlaybackQueue: jest.fn(),
  getAvailableDevices: jest.fn(),
  getCurrentlyPlayingTrack: jest.fn(),
  getPlaybackState: jest.fn(),
  getRecentlyPlayedTracks: jest.fn(),
  getUsersQueue: jest.fn(),
  pausePlayback: jest.fn(),
  seekToPosition: jest.fn(),
  setPlaybackVolume: jest.fn(),
  setRepeatMode: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
  startResumePlayback: jest.fn(),
  togglePlaybackShuffle: jest.fn(),
  transferPlayback: jest.fn(),
} as unknown as jest.Mocked<SpotifyApi['player']>

// Mock the entire SpotifyApi with a mocked player
export const mockSpotifyApi: jest.Mocked<SpotifyApi> = {
  player: mockPlayer,
} as jest.Mocked<SpotifyApi>

export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
}
