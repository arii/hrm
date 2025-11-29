import { NextResponse } from 'next/server'
import { SpotifyApiService } from '@/services/spotifyApi'

export async function GET(_req: Request) {
  try {
    const spotifyApiService = SpotifyApiService.getInstance()
    const sdk = spotifyApiService.getSdk()

    if (!sdk) {
      return NextResponse.json(
        { error: 'Spotify service not available' },
        { status: 503 }
      )
    }

    const devices = await sdk.player.getAvailableDevices()
    return NextResponse.json(devices.devices || [])
  } catch (error) {
    const err = error as { status?: number; message?: string }
    return NextResponse.json(
      {
        error: 'Spotify API error',
        details: err.message || 'Unknown Spotify error',
      },
      { status: err.status || 500 }
    )
  }
}
