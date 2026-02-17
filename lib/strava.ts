import { env } from './env'
import { refreshOAuthToken } from './oauth-utils'

export const STRAVA_CONSTANTS = {
  TOKEN_URL: 'https://www.strava.com/oauth/token',
}

/**
 * Shared fetch wrapper for refreshing Strava tokens
 */
export async function refreshStravaToken(refreshToken: string) {
  return refreshOAuthToken({
    url: STRAVA_CONSTANTS.TOKEN_URL,
    clientId: env.STRAVA_CLIENT_ID!,
    clientSecret: env.STRAVA_CLIENT_SECRET!,
    refreshToken,
    authMethod: 'body',
  })
}
