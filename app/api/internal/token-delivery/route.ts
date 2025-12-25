import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'

/**
 * @route POST /api/internal/token-delivery
 * @description Secure internal endpoint for receiving updated Spotify tokens.
 * This route handler's primary responsibility is to ACKNOWLEDGE the request.
 * The actual token processing is handled by a middleware layer in `server.ts`
 * that intercepts the request *before* it reaches this Next.js route handler.
 * This ensures the running Node.js server instance gets the token immediately.
 *
 * @protection This endpoint is protected by a secret header (`x-internal-token-secret`).
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate the request from our internal callback
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET
    if (!expected) {
      throw new ApiError(500, 'INTERNAL_TOKEN_DELIVERY_SECRET is not set.')
    }
    if (secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized: Missing or invalid secret.')
    }

    // The middleware in `server.ts` handles the actual token processing.
    // This handler just needs to confirm the request was received and authenticated.
    return NextResponse.json({
      ok: true,
      message: 'Token delivery acknowledged.',
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
