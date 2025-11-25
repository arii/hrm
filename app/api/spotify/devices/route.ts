// File: app/api/spotify/devices/route.ts (Refactored)
/**
 * API route to fetch available Spotify devices for the authenticated user.
 *
 * This endpoint now delegates the business logic of fetching devices to the
 * SpotifyApiService.
 */
import { getDevices } from '@/services/spotifyApiService'
import { NextResponse } from 'next/server'

export async function GET(_req: Request) {
  const result = await getDevices()

  if (result.success) {
    return NextResponse.json(result.data.devices || [])
  } else {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
}
