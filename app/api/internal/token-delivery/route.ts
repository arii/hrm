import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { spotifyTokenManager } from '@/utils/services'
import { SpotifyTokenPayload } from '@/services/spotifyTokenManager'

/**
 * Internal endpoint for NextAuth to deliver tokens directly to the SpotifyTokenManager.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It updates the token in-memory, avoiding fragile file system dependencies.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = (await req.json()) as SpotifyTokenPayload

    // Directly update the singleton instance of the token manager
    if (spotifyTokenManager) {
      spotifyTokenManager.updateTokenPayload(payload)
      logger.info(
        { subject: payload.sub ?? payload.provider },
        'Delivered token directly to SpotifyTokenManager'
      )
    } else {
      throw new Error('SpotifyTokenManager service not available.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    logger.error({ err }, 'token-delivery error')
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
