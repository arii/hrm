import { env } from './env'
import logger from '@/utils/logger'

export const STRAVA_CONSTANTS = {
  TOKEN_URL: 'https://www.strava.com/oauth/token',
}

/**
 * Shared fetch wrapper for refreshing Strava tokens
 */
export async function refreshStravaToken(refreshToken: string) {
  const response = await fetch(STRAVA_CONSTANTS.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID || '',
      client_secret: env.STRAVA_CLIENT_SECRET || '',
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
      'Failed to refresh Strava token'
    )

    try {
      const errorJson = JSON.parse(errorBody)
      throw new Error(
        errorJson.message || errorJson.error || 'Strava token refresh failed'
      )
    } catch {
      throw new Error(
        `Strava token refresh failed: ${response.status} ${response.statusText} - ${errorBody}`
      )
    }
  }

  return response.json()
}
