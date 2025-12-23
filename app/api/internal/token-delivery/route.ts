import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It logs the reception of the token and returns a 200 OK.
 * The actual token processing is handled by middleware in `server.ts`.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = await req.json()

    logger.info(
      { subject: payload.sub ?? payload.provider },
      'Received token-delivery'
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
