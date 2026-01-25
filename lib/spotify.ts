import { env } from './env'
import type { SpotifyDevice } from '@/types/core'

export const SPOTIFY_CONSTANTS = {
  TOKEN_URL: 'https://accounts.spotify.com/api/token',
  BASE_URL: 'https://api.spotify.com/v1',
}

/**
 * Resolves the target device ID from a list of devices.
 * Returns the active device, or the first device if none are active.
 */
export function resolveSpotifyDeviceId(devices: SpotifyDevice[]): string {
  const activeDevice = devices.find((d) => d.is_active)
  return activeDevice?.id || devices[0]?.id || ''
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
