// File: app/api/debug/spotify-token-status/route.ts
import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '../../../../services/spotifyTokenManager'

export async function GET() {
  try {
    const tokenManager = new SpotifyTokenManager()

    const accessToken = await tokenManager.getValidAccessToken()

    if (!accessToken) {
      return NextResponse.json({ status: 'no_token_found' }, { status: 200 })
    }

    return NextResponse.json(
      {
        status: 'token_found',
        accessToken: `${accessToken.substring(0, 5)}...`,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error in spotify-token-status API:', error)
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json(
      { status: 'error', message: errorMessage },
      { status: 500 }
    )
  }
}
