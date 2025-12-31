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

