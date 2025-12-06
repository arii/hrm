// File: app/api/internal/token-delivery/route.ts
/**
 * Internal endpoint for NextAuth to post the full token payload.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It passes the token payload to the singleton spotifyService instance.
 */
import { NextRequest, NextResponse } from 'next/server'
import { spotifyServiceInstance } from '@/utils/socketManager'
import { SpotifyTokenPayload } from '@/services/spotifyTokenManager'
import { ApiError } from '@/lib/errors'
import logger from '@/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = (await req.json()) as SpotifyTokenPayload

    if (!spotifyServiceInstance) {
      throw new ApiError(503, 'Spotify service is not available.')
    }

    // Pass the token to the singleton service instance
    await spotifyServiceInstance.setToken(payload)

    logger.info(
      { subject: payload.sub ?? payload.provider },
      'Received and processed token-delivery'
    )
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
