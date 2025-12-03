import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * @openapi
 * /api/spotify/devices:
 *   get:
 *     summary: Get Spotify Devices
 *     description: Fetches the list of available Spotify playback devices for the authenticated user.
 *     tags:
 *       - Spotify
 *     responses:
 *       200:
 *         description: A list of available devices.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SpotifyDevice'
 *       401:
 *         description: Not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(_req: Request) {
  try {
    // 1. Get the server-side session.
    const session = await getServerSession(authOptions)

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `[API /devices] Spotify API error: ${response.status} ${errorText}`
      )
      return NextResponse.json(
        { error: 'Failed to fetch devices from Spotify.' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data.devices || [])
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /devices] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
