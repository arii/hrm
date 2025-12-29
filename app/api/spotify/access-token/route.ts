import { authOptions } from '@/lib/auth'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { getToken } from 'next-auth/jwt'
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
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET })

    if (token && token.accessToken && token.refreshToken) {
      const spotifyService = serviceContainer.get('spotifyService')

      // The handleTokenUpdate method is idempotent and safe to call.
      // It will internally validate and update the token if necessary.
      await spotifyService.handleTokenUpdate({
        provider: 'spotify',
        sub: token.sub || 'unknown',
        access_token: token.accessToken as string,
        refresh_token: token.refreshToken as string,
        expires_in: 3600, // Nominal value; the service handles its own refresh logic.
        scope: '',
        obtainedAt: Date.now()
      })
      logger.debug('Successfully hydrated SpotifyService from access-token route.')
    }
  } catch (error) {
    // This can happen if the request is malformed or there's an issue with JWT parsing.
    // We log it as a warning because this internal process should not fail the client's request.
    logger.warn({ error }, 'Failed to get JWT for service hydration.')
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
    logger.error({ error: message }, 'Internal Server Error in access-token route.')
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
