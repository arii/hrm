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
    expect(() => (spotifyPolling as any).getSdk()).toThrow(
      'Spotify SDK has not been initialized.'
    )
  })
})
