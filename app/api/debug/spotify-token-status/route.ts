// File: app/api/debug/spotify-token-status/route.ts
import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '../../../../services/spotifyTokenManager'

/**
 * @openapi
 * /api/debug/spotify-token-status:
 *   get:
 *     summary: Get Spotify Token Status
 *     description: >
 *       A debug endpoint to check the status of the persisted Spotify token,
 *       including whether it's expired or close to expiring.
 *     tags:
 *       - Debug
 *     responses:
 *       200:
 *         description: The current status of the persisted token.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SpotifyTokenStatus'
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: no_token_found
 *       500:
 *         description: An error occurred while checking the token status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )

    const currentToken = tokenManager['currentToken'] // Access private property for debugging

    if (!currentToken) {
      return NextResponse.json({ status: 'no_token_found' }, { status: 200 })
    }

    const maskedRefreshToken = currentToken.payload.refresh_token
      ? `${currentToken.payload.refresh_token.substring(0, 5)}...${currentToken.payload.refresh_token.substring(currentToken.payload.refresh_token.length - 5)}`
      : 'N/A'

    const expiresAt =
      currentToken.payload.obtainedAt + currentToken.payload.expires_in * 1000

    return NextResponse.json(
      {
        status: 'token_found',
        userId: currentToken.payload.sub,
        accessToken: `${currentToken.payload.access_token.substring(0, 5)}...`,
        refreshToken: maskedRefreshToken,
        expiresIn: currentToken.payload.expires_in,
        obtainedAt: new Date(currentToken.payload.obtainedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        isExpired: Date.now() >= expiresAt,
        willExpireSoon: Date.now() >= expiresAt - 60000, // Within 1 minute
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error in spotify-token-status API:', error)
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json(
      { status: 'error', message: errorMessage },
      { status: 500 }
    )
  }
}
