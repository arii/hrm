// File: lib/spotify/sdk.ts
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { ApiError } from '@/lib/errors'
import { SPOTIFY_DEFAULT_TOKEN_EXPIRY_S } from '@/constants/spotify'
import { env } from '@/lib/env'

/**
 * Creates a Spotify SDK instance for the authenticated user.
 * This function should be used within API routes to get a pre-configured SDK.
 * It handles session retrieval and token validation.
 *
 * @returns An instance of the SpotifyApi.
 * @throws {ApiError} If the user is not authenticated or the token is missing.
 */
export async function getAuthenticatedSpotifyApi(): Promise<SpotifyApi> {
  const session = await getServerSession(authOptions)

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new ApiError(500, 'Spotify client ID or secret not configured.')
  }

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  // The Spotify SDK needs the full AccessToken object.
  // We reconstruct it from the session data.
  const token = {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: SPOTIFY_DEFAULT_TOKEN_EXPIRY_S, // Nominal value; NextAuth manages session/token refresh.
    refresh_token: session.refreshToken ?? '',
  }

  return SpotifyApi.withAccessToken(env.SPOTIFY_CLIENT_ID, token)
}
