import { ApiError } from '@/lib/errors'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import logger from '@/utils/logger'
import { spotifyServiceInstance } from '@/utils/socketManager'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It persists the latest token payload to ./logs/spotify_tokens.json and then
 * directly signals the live SpotifyPolling service to re-initialize and poll,
 * creating a deterministic, event-driven flow.
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

    // Ensure logs dir exists
    await fs.mkdir(LOG_DIR, { recursive: true })

    // Write timestamped record (overwrite with latest)
    const record = {
      receivedAt: Date.now(),
      payload,
    }
    await fs.writeFile(OUT_FILE, JSON.stringify(record, null, 2), 'utf8')

    logger.info(
      { subject: payload.sub ?? payload.provider },
      'Token delivery received and persisted.'
    )

    // --- Deterministic Service Signaling ---
    // After successfully writing the token, directly signal the live service.
    // This replaces the fragile, timing-based file-watching logic.
    if (spotifyServiceInstance && spotifyServiceInstance.isReady()) {
      logger.info('Signaling Spotify service to re-initialize with new token.')
      // Signal the service to reload tokens from disk
      spotifyServiceInstance.setRefreshToken('signal')
      // Immediately force a poll to update the state
      await spotifyServiceInstance.forcePollAndBroadcast()
      logger.info('Spotify service signaled and polled successfully.')
    } else {
      logger.warn(
        'Spotify service instance not available or not ready. Skipping signal.'
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
