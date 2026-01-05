// File: tests/unit/spotifyPolling.test.ts
import { jest } from '@jest/globals'
import { SpotifyPolling } from '@/services/spotifyPolling'
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import { ServerMessage } from '@/types/websocket'
import logger from '@/utils/logger'

// Mock the logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock the env
jest.mock('@/lib/env', () => ({
  env: {
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_CLIENT_SECRET: 'test_client_secret',
    SPOTIFY_TOKEN_PERSISTENCE: 'true',
    ENCRYPTION_KEY:
      'a2a3a4a5a6a7a8a9b0b1b2b3b4b5b6b7a2a3a4a5a6a7a8a9b0b1b2b3b4b5b6b7',
  },
}))

describe('SpotifyPolling', () => {
  let broadcastUpdate: jest.Mock<void, [ServerMessage]>
  let spotifyPolling: SpotifyPolling
  let mockSpotifyApi: jest.Mocked<SpotifyApi>

  beforeEach(() => {
    broadcastUpdate = jest.fn()
    // Setup mockSpotifyApi with all necessary mocked methods
    mockSpotifyApi = {
      player: {
        getPlaybackState: jest.fn(),
        pause: jest.fn(),
        next: jest.fn(),
        previous: jest.fn(),
        setVolume: jest.fn(),
      },
      // Add other necessary mocked methods
    } as any
    spotifyPolling = new SpotifyPolling(broadcastUpdate)
    // Manually set the mocked spotifyApi instance
    ;(spotifyPolling as any).spotifyApi = mockSpotifyApi

    // Mock Date.now
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01T00:00:00Z').getTime())
  })

  afterEach(() => {
    jest.clearAllMocks()
    spotifyPolling.dispose()
    jest.restoreAllMocks()
  })

  it('should not poll when not initialized', async () => {
    await spotifyPolling.forcePollAndBroadcast()
    expect(mockSpotifyApi.player.getPlaybackState).not.toHaveBeenCalled()
  })

  it('should poll when initialized', async () => {
    const accessToken: AccessToken = {
      access_token: 'test_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test_refresh_token',
    }
    spotifyPolling.setSdk(mockSpotifyApi, accessToken)

    await spotifyPolling.forcePollAndBroadcast()
    expect(mockSpotifyApi.player.getPlaybackState).toHaveBeenCalled()
  })

  // Add more tests for other methods and scenarios
})
