import { ApiError, ServiceInitializationError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { getSpotifyService } from '@/lib/services'
import { z } from 'zod'

const TokenDeliverySchema = z.object({
  provider: z.string(),
  sub: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  obtainedAt: z.number(),
})

/**
 * @route POST /api/internal/token-delivery
 * @description Secure internal endpoint for receiving updated Spotify tokens from NextAuth callbacks.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request from our internal callback
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.NEXTAUTH_SECRET
    if (!expected) {
      throw new ApiError(500, 'NEXTAUTH_SECRET is not set.')
    }
    if (secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid secret.')
    }

    // 2. Parse and validate the token from the request body
    const body = await req.json()
    const result = TokenDeliverySchema.safeParse(body)

    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid token structure')
      throw new ApiError(400, 'Bad Request: Invalid token structure.')
    }

    const tokenData = result.data

    // 3. Get the singleton instance of the Spotify service
    const spotifyService = getSpotifyService()

    // 4. Directly and reliably update the service with the new token
    await spotifyService.handleTokenUpdate(tokenData)
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

    if (err instanceof ServiceInitializationError) {
      logger.warn(
        `Service Initialization Error in token-delivery: ${err.message}`
      )
      return NextResponse.json({ error: err.message }, { status: 503 })
    }

    logger.error({ err }, 'Unhandled error in token-delivery')
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
