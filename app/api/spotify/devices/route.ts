// File: app/api/spotify/devices/route.ts
/**
 * API Route: /api/spotify/devices
 * Description: Retrieves the list of available Spotify Connect devices.
 * This endpoint accesses the running SpotifyPolling service instance to fetch
 * the device data.
 */
import { getServices } from '../../../../services/serviceManager'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  try {
    const { spotifyService } = getServices()

    if (!spotifyService || typeof spotifyService.getAvailableDevices !== 'function') {
      return NextResponse.json(
        { error: 'Spotify service is not available or initialized.' },
        { status: 503 } // 503 Service Unavailable
      )
    }

    const devices = await spotifyService.getAvailableDevices()
    return NextResponse.json(devices)
  } catch (err) {
    console.error('/api/spotify/devices error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
