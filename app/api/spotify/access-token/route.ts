import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * @openapi
 * /api/spotify/access-token:
 *   get:
 *     summary: Retrieve Spotify Access Token
 *     description: Fetches the Spotify access token from the user's session for client-side SDK initialization.
 *     tags:
 *       - Spotify
 *     responses:
 *       200:
 *         description: Successfully retrieved the access token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: The Spotify access token.
 *       401:
 *         description: Unauthorized. The user is not authenticated or the token is missing/invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export async function GET(_req: Request): Promise<NextResponse> {
  try {
    // 1. Get the server-side session (NextAuth automatically refreshes tokens)
    const session = await getServerSession(authOptions)

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      console.error('[API /access-token] No session or access token found.')
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    // 3. Check for refresh errors from NextAuth
    if (session.error === 'RefreshAccessTokenError') {
      console.error('[API /access-token] Token refresh failed in NextAuth')
      return NextResponse.json(
        { error: 'Token refresh failed. Please re-authenticate.' },
        { status: 401 }
      )
    }

    // 4. Return the access token (already refreshed by NextAuth if needed)
    return NextResponse.json({
      accessToken: session.accessToken,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /access-token] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
