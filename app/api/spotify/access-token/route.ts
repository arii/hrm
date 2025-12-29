import { authOptions } from '@/lib/auth'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { serviceContainer } from '@/lib/serviceContainer'
import { env } from '@/lib/env'

/**
 * API route to securely provide the Spotify access token to the client.
 * * ALSO: Hydrates the server-side SpotifyService if it's missing credentials.
 * This ensures that on page reload (session resumption), the WebSocket service
 * gets the necessary tokens to function.
 */
export async function GET(req: Request) {
  try {
    // 1. Get the server-side session
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

    // --- SERVICE HYDRATION START ---
    // We retrieve the raw JWT to get the refresh token (which is NOT in the session object)
    // and pass it to the internal SpotifyService.
    try {
      const token = await getToken({
        req: req as any,
        secret: env.NEXTAUTH_SECRET
      })

      if (token && token.accessToken && token.refreshToken) {
        const spotifyService = serviceContainer.get('spotifyService')

        // Only update if the service needs it or if we want to ensure freshness
        // handleTokenUpdate is safe to call; it handles internal state updates.
        await spotifyService.handleTokenUpdate({
          provider: 'spotify',
          sub: token.sub || 'unknown',
          access_token: token.accessToken as string,
          refresh_token: token.refreshToken as string,
          expires_in: 3600, // Nominal, service handles refresh
          scope: '',
          obtainedAt: Date.now()
        })
        logger.debug('Hydrated SpotifyService from access-token route.')
      }
    } catch (hydrationError) {
      // Don't block the client response if internal hydration fails
      logger.warn({ error: hydrationError }, 'Failed to hydrate SpotifyService')
    }
    // --- SERVICE HYDRATION END ---

    // 4. Return the access token to the client
    return NextResponse.json({
      accessToken: session.accessToken,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    logger.error({ error: message }, 'Internal Server Error')
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
