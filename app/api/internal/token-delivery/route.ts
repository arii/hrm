import { ApiError } from '@/lib/errors'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import logger from '@/utils/logger'
import { spotifyService } from '@/utils/socketManager'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It persists the latest token payload to ./logs/spotify_tokens.json for the server to read,
 * and then immediately signals the running Spotify service to reload the new token.
 */

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const OUT_FILE = path.join(LOG_DIR, 'spotify_tokens.json')

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

    const payload = await req.json()

    // ensure logs dir
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

    // write timestamped record (overwrite with latest)
    const record = {
      receivedAt: Date.now(),
      payload,
    }
    fs.writeFileSync(OUT_FILE, JSON.stringify(record, null, 2), 'utf8')

    logger.info(
      { subject: payload.sub ?? payload.provider },
      'Received and persisted token-delivery'
    )

    // --- CRITICAL STEP: Signal the running service to reload the token ---
    if (spotifyService) {
      // Use await to ensure the reload is attempted before responding
      await spotifyService.reloadSdk()
      logger.info('Successfully signaled Spotify service to reload token.')
    } else {
      logger.warn(
        'Spotify service not available in socketManager. Could not signal token reload.'
      )
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
