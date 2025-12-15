import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'
import { spotifyServiceInstance } from '@/utils/socketManager'

/**
 * @route POST /api/internal/token-delivery
 * @description Internal endpoint for NextAuth to post refresh tokens directly to the running Spotify service.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It directly invokes the spotifyServiceInstance to avoid file system race conditions.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Security Check
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    // 2. Ensure Service is Running
    if (!spotifyServiceInstance) {
      logger.error(
        'Spotify service not initialized. Cannot deliver token. This may happen if the main server is down.'
      )
      throw new ApiError(503, 'Service Unavailable: Spotify service is not running.')
    }

    // 3. Process the Token
    const payload = await req.json()

    // 4. Directly call the service to process the new token
    // This is a new method to be created on the SpotifyPolling class
    await spotifyServiceInstance.processNewTokens(payload)

    logger.info(
      { subject: payload.sub ?? payload.provider },
      'Successfully delivered token to Spotify service in-memory.'
    )

    return NextResponse.json({ ok: true, message: 'Token delivered successfully.' })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    const errorMessage =
      err instanceof Error ? err.message : 'An unknown error occurred'
    logger.error(
      { err: errorMessage },
      'Token delivery failed'
    )
    return NextResponse.json(
      { error: 'server_error', details: errorMessage },
      { status: 500 }
    )
  }
}
