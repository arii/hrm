// app/api/spotify/devices/route.ts

import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { withValidation } from '@/lib/middleware/validation'
import { spotifyDevicesSchema } from '@/lib/validation/schemas'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validated API route handler to fetch available Spotify devices.
 *
 * This handler retrieves the list of devices from the Spotify API and returns
 * them to the client. The withValidation middleware ensures no unexpected
 * query parameters are passed.
 *
 * @param _req The incoming Next.js API request (unused).
 * @param _validatedData The validated data object (empty for this route).
 * @returns A NextResponse object with the device list or an error.
 */
const devicesHandler = async (
  _req: NextRequest,
  _validatedData: z.infer<typeof spotifyDevicesSchema>
) => {
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

// Wrap the handler with the validation middleware and the corresponding schema
export const GET = withValidation(spotifyDevicesSchema, devicesHandler)
