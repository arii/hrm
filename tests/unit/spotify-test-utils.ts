import { jest } from '@jest/globals'
import { SpotifyPollingService } from '../../services/spotifyPolling'

export { mockPlayer, mockSpotifyApi, mockLogger } from './spotify-mocks'

/**
 * Test setup helper for SpotifyPolling service.
 * Creates an instance of the service with mocked dependencies.
 * @returns A tuple containing the service instance and the broadcast mock function.
 */
export async function setupSpotifyPollingService(): Promise<
  [SpotifyPollingService, jest.Mock]
> {
  const broadcastMock = jest.fn()
  const service = await SpotifyPollingService.create(broadcastMock)

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
