import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { spotifyServiceInstance } from '@/utils/socketManager'
import { SpotifyTokenPayload } from '@/services/spotifyTokenManager'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It directly notifies the running Spotify service of the new token.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = (await req.json()) as SpotifyTokenPayload

    // Directly update the service instance
    if (spotifyServiceInstance) {
      await spotifyServiceInstance.handleTokenUpdate(payload)
      logger.info(
        { subject: payload.sub ?? payload.provider },
        'Delivered token directly to Spotify service'
      )
    } else {
      // This case should ideally not happen if the server is running correctly
      logger.error(
        'Spotify service not available for direct token delivery. This may indicate a startup issue.'
      )
      throw new ApiError(503, 'Spotify service is unavailable')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    logger.error('token-delivery error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
