import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { getSpotifyService } from '@/lib/services'
import { env } from '@/lib/env'
import { TokenDeliverySchema } from '@/types/spotify'

/**
 * @route POST /api/internal/token-delivery
 * @description Secure internal endpoint for receiving updated Spotify tokens from NextAuth callbacks.
 *
 * @protection This endpoint is protected by a secret header (`x-internal-token-secret`)
 * defined in the `INTERNAL_TOKEN_DELIVERY_SECRET` or `NEXTAUTH_SECRET` environment variables.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = env.INTERNAL_TOKEN_DELIVERY_SECRET || env.NEXTAUTH_SECRET

    if (secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid secret.')
    }

    const body = await req.json()
    const result = TokenDeliverySchema.safeParse(body)

    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid token structure')
      throw new ApiError(400, 'Bad Request: Invalid token structure.')
    }

    const tokenData = {
      ...result.data,
      obtainedAt: result.data.obtainedAt ?? Date.now(),
    }

    await getSpotifyService().handleTokenUpdate(tokenData)
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
