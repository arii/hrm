import { env } from './env'
import { refreshOAuthToken } from './oauth-utils'

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
  return refreshOAuthToken({
    url: SPOTIFY_CONSTANTS.TOKEN_URL,
    clientId: env.SPOTIFY_CLIENT_ID!,
    clientSecret: env.SPOTIFY_CLIENT_SECRET!,
    refreshToken,
    authMethod: 'basic',
  })
}
