import { authOptions } from '@/lib/auth'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { getToken, JWT } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { serviceContainer } from '@/lib/serviceContainer'
import { env } from '@/lib/env'

/**
 * Attempts to hydrate the server-side SpotifyService with the token from the JWT.
 * This operation is critical for ensuring the backend service is ready for WebSocket
 * commands after a page reload. It's designed to be awaited.
 * @param req The incoming NextRequest, used to extract the JWT.
 */
async function _tryHydrateSpotifyService(req: NextRequest): Promise<void> {
  let userId: string | null = null
  let token: JWT | null = null

  try {
    token = await getToken({ req, secret: env.NEXTAUTH_SECRET })
    userId = token?.sub || null

    if (
      token &&
      typeof token.accessToken === 'string' &&
      typeof token.refreshToken === 'string'
    ) {
      const spotifyService = serviceContainer.get('spotifyService')

      const expiresIn =
        token.exp && token.iat ? Math.max(0, token.exp - token.iat) : 3600

      await spotifyService.handleTokenUpdate({
        provider: 'spotify',
        sub: token.sub || 'unknown',
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expires_in: expiresIn,
        scope: '',
        obtainedAt: Date.now(),
      })
      logger.debug(
        { userId },
        'Successfully hydrated SpotifyService from access-token route.'
      )
    } else if (token) {
      // This case is important for debugging token issues.
      logger.warn(
        { userId },
        'JWT was retrieved but missing accessToken or refreshToken.'
      )
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    logger.warn(
      { error: errorMessage, userId },
      'Failed to get JWT for service hydration.'
    )
  }
}

/**
 * API route to securely provide the Spotify access token to the client.
 * ALSO: Awaits the hydration of the server-side SpotifyService to ensure it's
 * initialized on session resumption, which is critical for serverless environments.
 */
export async function GET(req: Request) {
  try {
    // 1. Get the server-side session to validate the user and get the token for the client.
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      logger.error('No session or access token found.')
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    if (session.error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: 'Token refresh failed. Please re-authenticate.' },
        { status: 401 }
      )
    }

    // 2. Await the internal service hydration to ensure it completes before the
    // serverless function potentially freezes. The latency is negligible (<10ms).
    await _tryHydrateSpotifyService(req as NextRequest)

    // 3. Return the access token to the client.
    return NextResponse.json({
      accessToken: session.accessToken,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    logger.error(
      { error: message },
      'Internal Server Error in access-token route.'
    )
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
