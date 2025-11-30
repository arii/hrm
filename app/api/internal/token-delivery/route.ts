import fs from 'fs'
import { getServices } from '../../../../services/serviceManager.js'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

/**
 * Internal endpoint for NextAuth to post refresh tokens.
 * This endpoint is protected by an optional INTERNAL_TOKEN_DELIVERY_SECRET header.
 * It persists the latest token payload to ./logs/spotify_tokens.json for the server to read.
 */

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const OUT_FILE = path.join(LOG_DIR, 'spotify_tokens.json')

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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

    console.log('Received token-delivery:', payload.sub ?? payload.provider)

    // After successfully writing the token, signal the running Spotify service to reload.
    // This replaces the custom logic that was previously in server.ts.
    try {
      const { spotifyService } = getServices()
      if (spotifyService) {
        // Signal the service to re-initialize its SDK with the new token from disk
        spotifyService.setRefreshToken('signal')

        // Asynchronously force a poll to get immediate feedback
        setTimeout(async () => {
          if (typeof spotifyService.forcePollAndBroadcast === 'function') {
            await spotifyService.forcePollAndBroadcast()
          }
        }, 1500)
      }
    } catch (serviceError) {
      console.error(
        'token-delivery: Failed to get services or signal Spotify service:',
        serviceError
      )
      // Do not fail the request, as the token was still delivered.
      // The service will pick it up on its next scheduled poll.
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('token-delivery error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
