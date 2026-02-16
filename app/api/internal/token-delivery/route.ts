import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { SpotifyTokenPayload } from '@/services/spotifyTokenManager'

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
    const tokenData = (await req.json()) as Record<string, unknown>
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
    // FIX: Removed `!spotifyService.isReady()` check.
    // The service might be uninitialized (not ready) because it's waiting for this very token to initialize.
    // This check created a circular dependency. We must allow the token delivery to proceed to bootstrap the SDK.
    if (!global.spotifyService) {
      throw new ApiError(503, 'Spotify service is not available.')
    }

    // 4. Directly and reliably update the service with the new token
    // We explicitly construct the payload to ensure type safety without 'any'.
    const sub = typeof tokenData.sub === 'string' ? tokenData.sub : 'unknown'
    if (sub === 'unknown') {
      logger.warn('Spotify token delivery: user identity (sub) is unknown.')
    }

    const payload: SpotifyTokenPayload = {
      provider: 'spotify',
      sub,
      access_token:
        typeof tokenData.access_token === 'string'
          ? tokenData.access_token
          : '',
      refresh_token:
        typeof tokenData.refresh_token === 'string'
          ? tokenData.refresh_token
          : '',
      expires_in:
        typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 3600,
      scope: typeof tokenData.scope === 'string' ? tokenData.scope : '',
      obtainedAt: Date.now(),
    }

    await global.spotifyService.handleTokenUpdate(payload)
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
