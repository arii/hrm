import { SpotifyPolling } from '@/services/spotifyPolling'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'

jest.mock('@/services/spotifyTokenManager')

describe('SpotifyPolling', () => {
  let broadcastUpdate: jest.Mock
  let spotifyPolling: SpotifyPolling

  beforeEach(async () => {
    broadcastUpdate = jest.fn()
    ;(SpotifyTokenManager as jest.Mock).mockClear()
    spotifyPolling = await SpotifyPolling.create(broadcastUpdate)
  })

  it('should throw an error when getSdk is called before initialization', () => {
    // Directly accessing a private method for testing purposes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (spotifyPolling as any).getSdk()).toThrow(
      'Spotify SDK has not been initialized.'
    )
  })

  it('should return early and not throw if getCurrentlyPlaying is called without an initialized SDK', async () => {
    // Arrange: The beforeEach block creates an instance where the SDK is not initialized
    // because the mocked SpotifyTokenManager doesn't provide a token.

    // Act & Assert
    // The method should complete without throwing an error because of the guard clause.
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (spotifyPolling as any).getCurrentlyPlaying()
    ).resolves.not.toThrow()

    // It should have returned early, so no broadcast should have been sent.
    expect(broadcastUpdate).not.toHaveBeenCalled()
  })
})
