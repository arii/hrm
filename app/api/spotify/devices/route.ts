// app/api/spotify/devices/route.ts
import { validateSession } from '@/lib/api/session'
import { getSpotifyClient } from '@/lib/api/spotify'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * API route to fetch available Spotify devices for the authenticated user.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    const session = await validateSession()
    const spotify = getSpotifyClient(session)

    const devicesResponse = await spotify.player.getAvailableDevices()
    return successResponse(devicesResponse.devices || [])
  } catch (error) {
    return errorResponse(error)
  }
}
