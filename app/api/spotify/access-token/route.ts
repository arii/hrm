import { NextResponse } from 'next/server'
import { SpotifyApiService } from '@/services/spotifyApi'

export async function GET(_req: Request) {
  try {
    const spotifyApiService = SpotifyApiService.getInstance()
    const tokenManager = spotifyApiService.getTokenManager()

    // The token manager holds the most up-to-date token, refreshed by the backend services.
    const accessToken = tokenManager.getSdkAccessToken()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Spotify token not available.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      accessToken: accessToken.access_token,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /access-token] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
