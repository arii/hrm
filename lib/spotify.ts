import { env } from './env'
import logger from '@/utils/logger'
import { SpotifyPlaylistItem } from '@/types/core'

export const SPOTIFY_CONSTANTS = {
  TOKEN_URL: 'https://accounts.spotify.com/api/token',
  BASE_URL: 'https://api.spotify.com/v1',
}

/**
 * Returns the Basic Auth header value for Spotify
 */
export function getSpotifyBasicAuth() {
  return (
    'Basic ' +
    Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')
  )
}

/**
 * Shared fetch wrapper for refreshing tokens
 */
export async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch(SPOTIFY_CONSTANTS.TOKEN_URL, {
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

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error(
      {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      },
      'Failed to refresh Spotify token'
    )

    // Attempt to parse the error body as JSON, but fall back to a generic error
    try {
      const errorJson = JSON.parse(errorBody)
      throw new Error(
        errorJson.error_description ||
          errorJson.error ||
          'Spotify token refresh failed'
      )
    } catch {
      // If parsing fails, throw a more generic error with the raw text
      throw new Error(
        `Spotify token refresh failed: ${response.status} ${response.statusText} - ${errorBody}`
      )
    }
  }

  return response.json()
}

export const getArtistNames = (artists: SpotifyPlaylistItem['artists']) =>
  Array.isArray(artists)
    ? artists
        .map((a) => a?.name)
        .filter(Boolean)
        .join(', ')
    : (artists ?? 'Unknown')
