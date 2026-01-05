import { env } from './env'

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
    throw await response.json()
  }

  return response.json()
}
