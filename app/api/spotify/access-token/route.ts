// File: app/api/spotify/access-token/route.ts
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth' // Using alias for cleaner imports

export const runtime = 'nodejs' // Force Node.js runtime

/**
 * API route to securely provide the Spotify access token to the client.
 *
 * This endpoint is essential for the client-side Spotify Web Playback SDK,
 * which requires an access token to initialize. By fetching the token via this
 * secure, server-side route, we avoid exposing sensitive session details
 * directly to the browser.
 *
 * @returns {Promise<NextResponse>} A JSON response containing the access token
 *                                   or an error message if the session is invalid.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)

    // Check if the session exists and if there is a valid access token
    if (!session?.accessToken) {
      logger.warn('Unauthorized attempt to access Spotify token.')
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    // Check for a specific error from the NextAuth refresh token flow
    if (session.error === 'RefreshAccessTokenError') {
      logger.error('Session has a refresh token error.')
      return NextResponse.json(
        { error: 'Token refresh failed. Please re-authenticate.' },
        { status: 401 }
      )
    }

    // If everything is fine, return the access token
    return NextResponse.json(
      { accessToken: session.accessToken },
      { status: 200 }
    )
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
