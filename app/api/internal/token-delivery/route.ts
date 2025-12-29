import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { serviceContainer } from '@/lib/serviceContainer'
import { AccessToken } from '@spotify/web-api-ts-sdk'

/**
 * @route POST /api/internal/token-delivery
 * @description Secure internal endpoint for receiving updated Spotify tokens from NextAuth callbacks.
 * This route is the new, reliable, event-driven way of updating the Spotify polling service.
 * It directly accesses the singleton `spotifyService` instance and calls its token update handler.
 * This replaces the previous fragile, timing-based middleware interception in `server.ts`.
 *
 * @protection This endpoint is protected by a secret header (`x-internal-token-secret`)
 * defined in the `INTERNAL_TOKEN_DELIVERY_SECRET` environment variable.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse the token from the request body
    const tokenData = (await req.json()) as AccessToken
    if (!tokenData || !tokenData.refresh_token) {
      throw new ApiError(400, 'Bad Request: Missing token data.')
    }

    // 2. Authenticate the request from our internal callback
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.NEXTAUTH_SECRET
    if (!expected) {
      throw new ApiError(500, 'NEXTAUTH_SECRET is not set.')
    }
    if (secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid secret.')
    }

    // 3. Get the singleton instance of the Spotify service
    const spotifyService = serviceContainer.get('spotifyService')

    // FIX: Removed `!spotifyService.isReady()` check.
    // The service might be uninitialized (not ready) because it's waiting for this very token to initialize.
    // This check created a circular dependency. We must allow the token delivery to proceed to bootstrap the SDK.
    if (!spotifyService) {
      throw new Api-Error(503, 'Spotify service is not available.')
    }

    // 4. Directly and reliably update the service with the new token
    await spotifyService.handleTokenUpdate({
      ...tokenData,
      provider: 'spotify',
      sub: '',
      scope: '',
      obtainedAt: Date.now(),
    })
    logger.info('Spotify token delivered and processed successfully.')

    return NextResponse.json({
      ok: true,
      message: 'Token delivered successfully.',
    })
  } catch (err) {
    if (err instanceof ApiError) {
      logger.warn(`API Error in token-delivery: ${err.message}`)
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    logger.error({ err }, 'Unhandled error in token-delivery')
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
