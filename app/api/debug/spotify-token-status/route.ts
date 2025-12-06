// File: app/api/debug/spotify-token-status/route.ts
import { NextResponse } from 'next/server'
import { SpotifyTokenManager } from '../../../../services/spotifyTokenManager'
import { SpotifyToken } from '@prisma/client'

export async function GET() {
  try {
    const tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )

    // We need to get a valid token to force a load from the DB
    await tokenManager.getValidAccessToken()

    const currentToken = (tokenManager as unknown as { currentToken: SpotifyToken | null }).currentToken // Access private property for debugging

    if (!currentToken) {
      return NextResponse.json({ status: 'no_token_found' }, { status: 200 })
    }

    const maskedRefreshToken = currentToken.refreshToken
      ? `${currentToken.refreshToken.substring(0, 5)}...${currentToken.refreshToken.substring(currentToken.refreshToken.length - 5)}`
      : 'N/A'

    const expiresAt = currentToken.accessTokenExpiresAt.getTime()

    // Calculate expires_in based on the difference between expiresAt and now
    const expiresIn = Math.round((expiresAt - Date.now()) / 1000)

    return NextResponse.json(
      {
        status: 'token_found',
        userId: currentToken.spotifyUserId,
        accessToken: `${currentToken.accessToken.substring(0, 5)}...`,
        refreshToken: maskedRefreshToken,
        expiresIn: expiresIn,
        obtainedAt: new Date(currentToken.updatedAt).toISOString(), // Using updatedAt as a proxy for obtainedAt
        expiresAt: new Date(expiresAt).toISOString(),
        isExpired: Date.now() >= expiresAt,
        willExpireSoon: Date.now() >= expiresAt - 60000, // Within 1 minute
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
