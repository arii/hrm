import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { services } from '@/lib/services'
import { ApiError } from '@/lib/errors'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * It directly calls the singleton spotifyService to update the tokens in memory.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = await req.json()
    if (services.spotifyService) {
      await services.spotifyService.handleTokenUpdate(payload)
      logger.info(
        { subject: payload.sub ?? payload.provider },
        'Delivered token to Spotify service'
      )
      return NextResponse.json({ ok: true })
    } else {
      logger.error(
        'Spotify service not initialized. Cannot deliver token via API route.'
      )
      return NextResponse.json(
        { error: 'spotify_service_unavailable' },
        { status: 503 }
      )
    }
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    const errorMessage =
      err instanceof Error ? err.message : 'An unknown error occurred'
    logger.error('token-delivery error:', {
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
