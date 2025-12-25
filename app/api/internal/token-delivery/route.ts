import { ApiError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/utils/logger'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It returns a 200 OK to acknowledge receipt.
 *
 * The actual token processing is handled by middleware in `server.ts`
 * which intercepts this specific route to update the singleton service directly.
 * We do not read the request body here to avoid stream consumption issues,
 * as the middleware may have already consumed it.
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError('Unauthorized', 401)
    }

    // Logic is handled by server middleware before reaching here.
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
