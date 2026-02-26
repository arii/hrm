/**
 * @jest-environment jsdom
 */
import {
  refreshSpotifyToken,
  getSpotifyBasicAuth,
  mapSpotifyTrack,
} from '@/lib/spotify'
import { SPOTIFY_CONSTANTS } from '@/lib/spotify'
import { Track } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger'
import { env } from '@/lib/env'

// Mock the logger to prevent console output during tests
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}))

describe('lib/spotify', () => {
  beforeEach(() => {
    // Manually mock the global fetch function
    global.fetch = jest.fn()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Restore fetch to its original state
    ;(global.fetch as jest.Mock).mockRestore()
  })

  describe('getSpotifyBasicAuth', () => {
    it('should return the correct Basic Auth header', () => {
      const expectedAuth =
        'Basic ' +
        Buffer.from(
          `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')
      expect(getSpotifyBasicAuth()).toBe(expectedAuth)
    })
  })

  describe('mapSpotifyTrack', () => {
    it('should correctly map a Spotify SDK track object to SpotifyPlaylistItem', () => {
      const mockSdkTrack: Partial<Track> = {
        id: 'track-id',
        name: 'Track Name',
        uri: 'spotify:track:track-id',
        duration_ms: 120000,
        artists: [{ name: 'Artist Name' } as any],
        album: {
          name: 'Album Name',
          images: [{ url: 'image-url', height: 300, width: 300 }],
        } as any,
      }

      const expected = {
        id: 'track-id',
        name: 'Track Name',
        uri: 'spotify:track:track-id',
        duration_ms: 120000,
        artists: [{ name: 'Artist Name' }],
        album: {
          name: 'Album Name',
          images: [{ url: 'image-url', height: 300, width: 300 }],
        },
      }

      expect(mapSpotifyTrack(mockSdkTrack as Track)).toEqual(expected)
    } )

    it('should handle missing album images', () => {
      const mockSdkTrack: Partial<Track> = {
        id: 'track-id',
        artists: [],
        album: {
          name: 'Album Name',
          // No images field
        } as any,
      }

      const result = mapSpotifyTrack(mockSdkTrack as Track)
      expect(result.album.images).toEqual([])
    })
  })

  describe('refreshSpotifyToken', () => {
    const refreshToken = 'test-refresh-token'

    it('should return a new token on successful refresh', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await refreshSpotifyToken(refreshToken)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(SPOTIFY_CONSTANTS.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: getSpotifyBasicAuth(),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })
    })

    it('should throw an error with a valid JSON error response', async () => {
      const errorResponse = {
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
      }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
        json: () => Promise.resolve(errorResponse),
      })

      await expect(refreshSpotifyToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          status: 400,
          statusText: 'Bad Request',
          body: JSON.stringify(errorResponse),
        },
        'Failed to refresh Spotify token'
      )
    })

    it('should throw an error with a non-JSON error response', async () => {
      const errorResponse = 'Internal Server Error'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(errorResponse),
      })

      await expect(refreshSpotifyToken(refreshToken)).rejects.toThrow(
        `Spotify token refresh failed: 500 Internal Server Error - ${errorResponse}`
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          status: 500,
          statusText: 'Internal Server Error',
          body: errorResponse,
        },
        'Failed to refresh Spotify token'
      )
    })

    it('should throw an error with a malformed JSON error response', async () => {
      const errorResponse = '{"error": "invalid_grant",,}'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(errorResponse),
      })

      await expect(refreshSpotifyToken(refreshToken)).rejects.toThrow(
        `Spotify token refresh failed: 400 Bad Request - ${errorResponse}`
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          status: 400,
          statusText: 'Bad Request',
          body: errorResponse,
        },
        'Failed to refresh Spotify token'
      )
    })
  })
})
