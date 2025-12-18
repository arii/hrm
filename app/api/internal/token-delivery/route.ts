import { ApiError } from '@/lib/errors'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import logger from '@/utils/logger'

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

    // Notify the main server process via an internal HTTP request
    try {
      const internalUrl = `${process.env.NEXTAUTH_URL}/api/internal/ipc/token-update`
      const response = await fetch(internalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token-secret': process.env.INTERNAL_TOKEN_DELIVERY_SECRET || '',
        },
        body: JSON.stringify({ payload }),
      })

      if (!response.ok) {
        throw new Error(`IPC request failed with status ${response.status}`)
      }
      logger.info(
        { subject: payload.sub ?? payload.provider },
        'Successfully forwarded token-delivery to main server'
      )
    } catch (ipcError) {
      logger.error(
        { err: ipcError },
        'Failed to forward token-delivery to main server'
      )
      // Do not block the client response for an IPC failure
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
