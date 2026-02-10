import { jest } from '@jest/globals'
import { SpotifyPolling } from '../../services/spotifyPolling'

export { mockPlayer, mockSpotifyApi, mockLogger } from './spotify-mocks'

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
  service.cleanup()

  return [service, broadcastMock]
}
