import { authOptions } from '@/lib/auth' // Using alias for cleaner imports
import { ApiError } from '@/lib/errors'
import { env } from '@/lib/env'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'

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
async function getAccessToken(_req: NextRequest) {
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
      env.SPOTIFY_CLIENT_ID || '',
      env.SPOTIFY_CLIENT_SECRET || ''
    )
    accessToken = await tokenManager.getValidAccessToken()
  }

  if (!accessToken) {
    if (session?.error === 'RefreshAccessTokenError') {
      throw new ApiError(401, 'Token refresh failed. Please re-authenticate.')
    }
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  return NextResponse.json({
    accessToken: accessToken,
  })
}

export const GET = withErrorHandler(getAccessToken)
