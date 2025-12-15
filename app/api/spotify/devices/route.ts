// File: app/api/spotify/devices/route.ts
import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import logger from '@/utils/logger'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs' // Force Node.js runtime

/**
 * API route to fetch available Spotify devices.
 *
 * This route is protected and requires a valid user session. It proxies the
 * request to the Spotify API's `/me/player/devices` endpoint.
 *
 * @param {Request} _req - The incoming request object (unused).
 * @returns {Promise<NextResponse>} A JSON response with the list of devices
 *                                   or an error message.
 */
async function getDevicesHandler(_req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  const { accessToken } = session
  const url = 'https://api.spotify.com/v1/me/player/devices'

  try {
    const spotifyResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.json()
      logger.error(
        {
          status: spotifyResponse.status,
          error: errorData,
        },
        'Failed to fetch devices from Spotify'
      )
      throw new ApiError(
        spotifyResponse.status,
        'Failed to fetch devices from Spotify.'
      )
    }

    const data = await spotifyResponse.json()
    return NextResponse.json(data.devices)
  } catch (error) {
    // Log the caught error and re-throw it to be handled by the middleware
    logger.error({ error }, 'Error fetching Spotify devices')
    if (error instanceof ApiError) {
      throw error // Re-throw ApiError to be handled by the middleware
    }
    // For other unexpected errors, wrap them in a generic ApiError
    throw new ApiError(500, 'An unexpected error occurred.')
  }
}

export const GET = withErrorHandler(getDevicesHandler)
