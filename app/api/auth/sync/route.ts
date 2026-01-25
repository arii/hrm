// File: app/api/auth/sync/route.ts (Explicit Spotify Token Sync API)
/**
 * @route POST /api/auth/sync
 * @description Explicit endpoint for the frontend to synchronize the NextAuth session token
 * with the backend services after a successful login. This ensures the backend has the
 * most up-to-date token immediately after authentication.
 *
 * @protection This endpoint is protected and requires a valid NextAuth session.
 * The session's associated Spotify token is used for synchronization.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { ApiError } from '@/lib/errors'
import { serviceContainer } from '@/lib/serviceContainer'
import { ApiSpotifyTokenPayload } from '@/types/spotify'
import logger from '@/utils/logger'
import { cookies } from 'next/headers'

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession(cookies())

    // 1. Validate session and token existence
    if (!session.token) {
      throw new ApiError(401, 'Unauthorized: No token in session.')
    }

    // 2. Get the singleton instance of the Spotify service
    const spotifyService = serviceContainer.get('spotifyService')
    if (!spotifyService) {
      throw new ApiError(503, 'Spotify service is not available.')
    }

    // 3. Prepare the token payload for the backend service
    // The session token is already in the correct format for ApiSpotifyTokenPayload
    const tokenPayload: ApiSpotifyTokenPayload = session.token

    // 4. Update the service with the new token
    await spotifyService.handleTokenUpdate(tokenPayload)
    logger.info('Spotify token explicitly synchronized via /api/auth/sync.')

    return NextResponse.json({
      ok: true,
      message: 'Token synchronized successfully.',
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
    const statusCode = err instanceof ApiError ? err.statusCode : 500

    logger.error({ err }, `Error in /api/auth/sync: ${errorMessage}`)

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
