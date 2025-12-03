import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

const TOKEN_FILE = path.resolve(process.cwd(), 'logs', 'spotify_tokens.json')

/**
 * @openapi
 * /api/debug/spotify-token:
 *   get:
 *     summary: Get Persisted Spotify Token
 *     description: >
 *       A debug endpoint to retrieve the contents of the persisted Spotify token file (`spotify_tokens.json`).
 *       This shows the exact token data the `SpotifyPolling` service is using.
 *     tags:
 *       - Debug
 *     responses:
 *       200:
 *         description: The persisted token object (or null if the file doesn't exist).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     receivedAt:
 *                       type: number
 *                     payload:
 *                       $ref: '#/components/schemas/SpotifyTokenPayload'
 *       500:
 *         description: An error occurred while reading the token file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    let token = null
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf8')
      token = JSON.parse(data)
    }
    return NextResponse.json({ ok: true, token })
  } catch (err) {
    console.error('debug/spotify-token error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
