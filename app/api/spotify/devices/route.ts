import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * API route to fetch available Spotify devices for the authenticated user.
 *
 * This endpoint retrieves the list of devices from the Spotify API using the
 * access token from the user's active session. Session-based authentication is required.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      throw new ApiError(401, 'Not authenticated: A valid user session is required.')
    }

    const accessToken = session.accessToken

    // Fetch devices from Spotify API.
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
