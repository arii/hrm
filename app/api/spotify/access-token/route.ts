// File: app/api/spotify/access-token/route.ts (Refactored)
/**
 * API route to securely provide the Spotify access token to the client.
 *
 * This endpoint now delegates the business logic of retrieving the token to the
 * SpotifyApiService, keeping the route handler clean and focused on the HTTP
 * request and response lifecycle.
 */
import { getAccessToken } from '@/services/spotifyApiService'
import { NextResponse } from 'next/server'

export async function GET(_req: Request) {
  const result = await getAccessToken()

  if (result.success) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
}
