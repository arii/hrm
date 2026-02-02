import { jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'
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

/**
 * Test setup helper for SpotifyPolling service.
 * Creates an instance of the service with mocked dependencies.
 * @returns A tuple containing the service instance and the broadcast mock function.
 */
export async function setupSpotifyPollingService(): Promise<
  [SpotifyPolling, jest.Mock]
> {
  const broadcastMock = jest.fn()
  const service = await SpotifyPolling.create(broadcastMock)

  // After creation, immediately stop any running timers to prevent side effects
  if (service._test_) {
    const pollInterval = service._test_.getPollInterval()
    if (pollInterval) clearInterval(pollInterval)
    service._test_.setPollInterval(null)

    const tokenRefreshInterval = service._test_.getTokenRefreshInterval()
    if (tokenRefreshInterval) clearInterval(tokenRefreshInterval)
    service._test_.setTokenRefreshInterval(null)
  }

  return [service, broadcastMock]
}
