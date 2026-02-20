import { authOptions } from '@/lib/auth' // Using alias for cleaner imports
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * API route to securely provide the Spotify access token to the client.
 *
 * This endpoint is called by the `useSpotifyWebPlayback` hook. It retrieves the
 * access token from the user's server-side session and returns it. This is the
 * recommended way to expose the token to the client-side SDK without exposing
 * it publicly or storing it in an insecure manner.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the access token or an error.
 */
export async function GET(_req: Request) {
  try {
    let accessToken: string | null = null
    const session = await getServerSession(authOptions)

    if (session?.accessToken && session.error !== 'RefreshAccessTokenError') {
      accessToken = session.accessToken
    } else {
      // Fallback to SpotifyTokenManager (System Token)
      logger.info(
        'No valid user session found, attempting system token fallback.'
      )
      const tokenManager = new SpotifyTokenManager(
        process.env.SPOTIFY_CLIENT_ID || '',
        process.env.SPOTIFY_CLIENT_SECRET || ''
      )
      accessToken = await tokenManager.getValidAccessToken()
    }

    if (!accessToken) {
      if (session?.error === 'RefreshAccessTokenError') {
        logger.error(
          'Token refresh failed in NextAuth and no fallback available'
        )
        return NextResponse.json(
          { error: 'Token refresh failed. Please re-authenticate.' },
          { status: 401 }
        )
      }
      logger.error(
        'Not authenticated: No user session or valid system token available.'
      )
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      accessToken: accessToken,
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
