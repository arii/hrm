import { jest } from '@jest/globals'

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
}

// Mock the entire SpotifyApi with a mocked player
export const mockSpotifyApi = {
  player: mockPlayer,
}

export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
}
