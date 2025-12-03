import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * API route to fetch available Spotify devices.
 *
 * This endpoint retrieves the list of devices from the Spotify API. It first
 * attempts to use the user's session token. If no session exists, it falls
 * back to a system-level token managed by SpotifyTokenManager, allowing
 * unauthenticated clients on the local network to view and control playback.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions)
    let accessToken = session?.accessToken

    // Fallback to system token if no user session is found
    if (!accessToken) {
      console.log(
        '[API /devices] No user session, attempting fallback to System Token...'
      )
      const tokenManager = new SpotifyTokenManager(
        process.env.SPOTIFY_CLIENT_ID || '',
        process.env.SPOTIFY_CLIENT_SECRET || ''
      )
      const systemToken = await tokenManager.getValidAccessToken()
      if (systemToken) {
        accessToken = systemToken
      }
    }

    if (!accessToken) {
      throw new ApiError(401, 'Not authenticated and no system token available.')
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
