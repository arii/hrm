// File: app/api/debug/spotify-token-status/route.ts
import { NextResponse } from 'next/server'
import { getSpotifyService } from '../../../../services/spotifyService'

export async function GET() {
  try {
    const spotifyService = getSpotifyService()
    const tokenInfo = spotifyService.getTokenDebugInfo()

    if (!tokenInfo) {
      return NextResponse.json({ status: 'no_token_found' }, { status: 200 })
    }

    return NextResponse.json(
      {
        status: 'token_found',
        userId: tokenInfo.userId,
        accessToken: tokenInfo.accessTokenPrefix,
        refreshToken: tokenInfo.refreshTokenMasked,
        expiresIn: tokenInfo.expiresIn,
        obtainedAt: tokenInfo.obtainedAt,
        expiresAt: tokenInfo.expiresAt,
        isExpired: tokenInfo.isExpired,
        willExpireSoon: tokenInfo.willExpireSoon,
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
