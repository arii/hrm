import { NextResponse } from 'next/server'
import { getBaseURL, getSpotifyCallbackURL } from '@/utils/urls'

/**
 * @openapi
 * /api/debug/auth-check:
 *   get:
 *     summary: Verify Auth Configuration
 *     description: >
 *       A debug endpoint to check if the necessary environment variables for
 *       NextAuth and Spotify OAuth are correctly loaded by the server.
 *     tags:
 *       - Debug
 *     responses:
 *       200:
 *         description: The current authentication configuration status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nextAuthConfigured:
 *                   type: boolean
 *                   description: True if NEXTAUTH_URL and NEXTAUTH_SECRET are set.
 *                 spotifyConfigured:
 *                   type: boolean
 *                   description: True if SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set.
 *                 clientId:
 *                   type: string
 *                   description: The loaded Spotify Client ID.
 *                 hasClientSecret:
 *                   type: boolean
 *                   description: True if a Spotify Client Secret is set.
 *                 redirectUri:
 *                   type: string
 *                   description: The calculated Spotify OAuth redirect URI.
 *       500:
 *         description: An error occurred while checking the configuration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const nextAuthUrl = getBaseURL()
    const nextAuthSecret = process.env.NEXTAUTH_SECRET

    return NextResponse.json({
      nextAuthConfigured: !!(nextAuthUrl && nextAuthSecret),
      spotifyConfigured: !!(clientId && clientSecret),
      clientId: clientId || undefined,
      hasClientSecret: !!clientSecret,
      redirectUri: getSpotifyCallbackURL(),
    })
  } catch (err) {
    console.error('Auth check failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
