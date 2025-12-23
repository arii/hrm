// File: tests/unit/spotifyPolling.test.ts
import { SpotifyPolling } from '../../services/spotifyPolling'
import { env } from '../../lib/env'

// Mock the Spotify API
jest.mock('@spotify/web-api-ts-sdk', () => {
  return {
    SpotifyApi: {
      withClientCredentials: jest.fn(() => ({
        player: {
          getPlaybackState: jest.fn(),
          pause: jest.fn(),
          next: jest.fn(),
        },
      })),
    },
  }
})

describe('SpotifyPolling', () => {
  let spotifyPolling: SpotifyPolling
  let broadcastUpdate: jest.Mock

  beforeEach(async () => {
    broadcastUpdate = jest.fn()
    // Set up environment variables for testing
    env.SPOTIFY_CLIENT_ID = 'test_client_id'
    env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
    env.SPOTIFY_POLLING_INTERVAL_MS = '100' // Use a short interval for testing
    env.SPOTIFY_DEBUG = 'false' // Disable debug logging in tests
    spotifyPolling = await SpotifyPolling.create(broadcastUpdate)
  })

  afterEach(() => {
    spotifyPolling.cleanup()
  })

  it('should be created', () => {
    expect(spotifyPolling).toBeInstanceOf(SpotifyPolling)
  })

  // Add more tests for the SpotifyPolling class here
})
