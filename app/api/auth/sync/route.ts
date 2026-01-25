import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import logger from '@/utils/logger'
import { getAPIURL } from '@/utils/urls'
import { env } from '@/lib/env'

/**
 * @route POST /api/auth/sync
 * @description Synchronizes the user's Spotify token from their NextAuth session with the backend service.
 * This is called by the client-side immediately after authentication to ensure the backend
 * service has the latest token to perform API calls on behalf of the user.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET })

    if (!token || !token.accessToken || !token.refreshToken) {
      logger.warn(
        '[API /auth/sync] Unauthorized: No valid token found in session.'
      )
      return NextResponse.json(
        { ok: false, message: 'Unauthorized: No valid token in session.' },
        { status: 401 }
      )
    }

    // Construct the payload to be sent to the internal token delivery endpoint.
    // This shape is based on the SpotifyTokenPayload expected by the SpotifyPolling service.
    const tokenPayload = {
      provider: 'spotify',
      sub: token.providerAccountId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_in: Math.floor(
        ((token.accessTokenExpires as number) - Date.now()) / 1000
      ),
      scope: token.scope || '',
      obtainedAt: Date.now(),
    }

    const response = await fetch(getAPIURL('internal/token-delivery'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': env.NEXTAUTH_SECRET,
      },
      body: JSON.stringify(tokenPayload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error(
        {
          status: response.status,
          body: errorBody,
        },
        '[API /auth/sync] Failed to sync token with the backend service.'
      )
      return NextResponse.json(
        { ok: false, message: 'Failed to sync token with backend.' },
        { status: response.status }
      )
    }

    logger.info(
      '[API /auth/sync] Token successfully synchronized with the backend service.'
    )
    return NextResponse.json({ ok: true, message: 'Token synchronized.' })
  } catch (error) {
    logger.error(
      { err: error },
      '[API /auth/sync] An unexpected error occurred.'
    )
    return NextResponse.json(
      { ok: false, message: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
