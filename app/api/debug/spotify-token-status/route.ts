// File: app/api/debug/spotify-token-status/route.ts
import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '../../../../services/spotifyTokenManager'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || '',
      prisma
    )

    const currentToken = tokenManager.getSdkAccessToken()

    if (!currentToken) {
      return NextResponse.json({ status: 'no_token_found' }, { status: 200 })
    }

    const maskedRefreshToken = currentToken.refresh_token
      ? `${currentToken.refresh_token.substring(0, 5)}...${currentToken.refresh_token.substring(currentToken.refresh_token.length - 5)}`
      : 'N/A'

    const expiresAt = currentToken.expires

    return NextResponse.json(
      {
        status: 'token_found',
        accessToken: `${currentToken.access_token.substring(0, 5)}...`,
        refreshToken: maskedRefreshToken,
        expiresIn: currentToken.expires_in,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'N/A',
        isExpired: expiresAt ? Date.now() >= expiresAt : false,
        willExpireSoon: expiresAt ? Date.now() >= expiresAt - 60000 : false, // Within 1 minute
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
