import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyDevice } from '@/types/websocket'

export async function GET() {
  let accessToken = null

  try {
    // 1. Get Access Token
    const tokenManager = new SpotifyTokenManager()
    accessToken = tokenManager.getSdkAccessToken()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Could not retrieve a valid Spotify access token.' },
        { status: 500 }
      )
    }

    // 2. Initialize SDK and Fetch Devices
    const sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken
    )
    const devicesResponse = await sdk.player.getAvailableDevices()

    // 3. Format and Respond
    // Filter out any devices that have a null ID, then map to our internal type.
    const devices: SpotifyDevice[] = devicesResponse.devices
      .filter((d) => d.id !== null)
      .map((d) => ({
        id: d.id as string, // Cast is safe here due to the filter
        is_active: d.is_active,
        is_private_session: d.is_private_session,
        is_restricted: d.is_restricted,
        name: d.name,
        type: d.type,
        volume_percent: d.volume_percent,
      }))

    return NextResponse.json(devices)
  } catch (error) {
    // Log the detailed error on the server
    console.error('[/api/spotify/devices] Error fetching devices:', error)

    // Check for specific Spotify API error structures
    if (
      error &&
      typeof error === 'object' &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error &&
      'message' in error.error
    ) {
      const spotifyError = error.error as { message: string; status?: number }
      return NextResponse.json(
        {
          error: `Spotify API Error: ${spotifyError.message}`,
        },
        { status: spotifyError.status || 500 }
      )
    }

    // Generic error for everything else
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
