import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * API route to fetch available Spotify devices.
 *
 * This endpoint retrieves the list of devices from the Spotify API.
 * It prioritizes the authenticated user's session token. If no session
 * exists (e.g., for external controllers), it falls back to a system-level
 * token for authorized access.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    let accessToken: string | null = null
    const session = await getServerSession(authOptions)

    if (session?.accessToken) {
      accessToken = session.accessToken
    } else {
      // Fallback to System Token
      console.log(
        '[API /devices] No user session found, attempting system token fallback.'
      )
      const tokenManager = new SpotifyTokenManager(
        process.env.SPOTIFY_CLIENT_ID || '',
        process.env.SPOTIFY_CLIENT_SECRET || '',
        prisma
      )
      accessToken = await tokenManager.getValidAccessToken()
    }

    if (!accessToken) {
      throw new ApiError(
        401,
        'Not authenticated: No user session or valid system token available.'
      )
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
