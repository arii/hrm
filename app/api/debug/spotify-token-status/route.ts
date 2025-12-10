// app/api/debug/spotify-token-status/route.ts

import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'

export async function GET() {
  try {
    const tokenManager = new SpotifyTokenManager()
    const token = tokenManager.getSdkAccessToken()

    if (token) {
      return NextResponse.json({
        status: 'success',
        message: 'Token is available and appears valid.',
        token: {
          accessToken: token.access_token,
          expiresIn: token.expires_in,
          tokenType: token.token_type,
        },
      })
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to retrieve a valid token.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[/api/debug/spotify-token-status] Error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      {
        status: 'error',
        message: 'An exception occurred while checking the token.',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
