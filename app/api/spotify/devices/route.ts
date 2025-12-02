// File: app/api/spotify/devices/route.ts
/**
 * API Route: /api/spotify/devices
 * Description: Fetches available Spotify playback devices using the centralized SpotifyPolling service.
 * This ensures that all Spotify API interactions are managed by a single, stateful service instance.
 */
import { NextResponse } from 'next/server'
import { spotifyServiceInstance } from '@/utils/socketManager'
import logger from '@/utils/logger'
import { ApiError } from '@/lib/errors'

/**
 * Handles GET requests to fetch available Spotify devices.
 * It now delegates the call to the singleton spotifyServiceInstance.
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET() {
  // Check if the spotifyServiceInstance is available and ready
  if (!spotifyServiceInstance || !spotifyServiceInstance.isReady()) {
    logger.warn(
      '[API /devices] Spotify service not initialized or not ready.'
    )
    // Return a 503 Service Unavailable error
    return NextResponse.json(
      {
        error:
          'Spotify service is not available. Please ensure you are logged in.',
      },
      { status: 503 }
    )
  }

  try {
    // Delegate the device fetch call to the centralized service
    const devices = await spotifyServiceInstance.getAvailableDevices()
    return NextResponse.json(devices || [])
  } catch (error) {
    // Handle potential errors from the service call
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    logger.error(`[API /devices] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
