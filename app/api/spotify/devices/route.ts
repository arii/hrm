// File: app/api/spotify/devices/route.ts
import { NextResponse } from 'next/server'
import { getSpotifyDevices } from '@/services/spotify/spotifyApiService'

export async function GET(_req: Request) {
  try {
    const devices = await getSpotifyDevices()
    return NextResponse.json(devices.devices || [])
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'

    if (errorMessage === 'Authorization required') {
      return NextResponse.json({ error: errorMessage }, { status: 401 })
    }

    console.error('[API /devices] Failed to get devices:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
