import type { JWT } from 'next-auth/jwt'
import { env } from '@/lib/env'
import logger from '@/utils/logger'
import { getAPIURL } from '@/utils/urls'

type TokenSyncPayload = {
  provider: string
  sub?: string
  access_token?: string
  refresh_token?: string
  expires_in: number
  scope: string
  obtainedAt: number
}

/** Builds the token-delivery payload from a NextAuth JWT. */
export const buildTokenSyncPayload = (token: JWT): TokenSyncPayload => ({
  provider: 'spotify',
  sub: token.providerAccountId, // providerAccountId is mapped to sub in JWT usually
  access_token: token.accessToken,
  refresh_token: token.refreshToken,
  expires_in: Math.floor(
    ((token.accessTokenExpires as number) - Date.now()) / 1000
  ),
  scope: token.scope || '', // Ensure scope is preserved in JWT if needed
  obtainedAt: Date.now(),
})

/**
 * Syncs a Spotify token with the backend token-delivery endpoint.
 * Fire-and-forget safe: logs failures, never throws.
 */
export const syncTokenToBackend = async (token: JWT): Promise<void> => {
  try {
    const tokenPayload = buildTokenSyncPayload(token)
    // Only sync if we have valid data
    if (!tokenPayload.access_token || !tokenPayload.refresh_token) return

    const response = await fetch(getAPIURL('internal/token-delivery'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': env.NEXTAUTH_SECRET,
      },
      body: JSON.stringify(tokenPayload),
    })

    if (response.ok) {
      logger.debug('Token successfully synced with the backend.')
    } else {
      logger.warn(
        {
          status: response.status,
          body: await response.text(),
        },
        'Failed to sync token with the backend.'
      )
    }
  } catch (e) {
    logger.error({ error: e }, 'Failed to sync refreshed token with backend')
  }
}
