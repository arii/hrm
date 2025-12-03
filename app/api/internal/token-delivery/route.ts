import { ApiError } from '@/lib/errors'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import logger from '@/utils/logger'

/**
 * @openapi
 * /api/internal/token-delivery:
 *   post:
 *     summary: Deliver Spotify Token for Persistence
 *     description: >
 *       An internal endpoint used by the authentication service (NextAuth) to deliver
 *       refreshed Spotify tokens. The server then persists this token to the filesystem
 *       so the `SpotifyPolling` service can use it.
 *     tags:
 *       - Internal
 *     parameters:
 *       - in: header
 *         name: x-internal-token-secret
 *         schema:
 *           type: string
 *         description: An optional secret to authorize the request, configured via INTERNAL_TOKEN_DELIVERY_SECRET.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpotifyTokenPayload'
 *     responses:
 *       200:
 *         description: Token successfully received and persisted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized. The provided secret was invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: An error occurred while persisting the token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const LOG_DIR = path.resolve(process.cwd(), 'logs')
const OUT_FILE = path.join(LOG_DIR, 'spotify_tokens.json')

import { withValidation } from '@/lib/middleware/validation'
import { spotifyTokenDeliverySchema } from '@/lib/validation/schemas'

export const POST = withValidation(spotifyTokenDeliverySchema, async (req, payload) => {
  try {
    const secretHeader = req.headers.get('x-internal-token-secret') || ''
    const expected = process.env.INTERNAL_TOKEN_DELIVERY_SECRET || ''
    if (expected && secretHeader !== expected) {
      throw new ApiError(401, 'Unauthorized')
    }

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
