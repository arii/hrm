import { prisma } from '../lib/prisma.js'

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

/**
 * Retrieves a valid Spotify access token for the given user ID.
 * It checks the database for the user's token.
 * If the token is expiring or expired, it attempts to refresh it against the Spotify API,
 * persists the new token, and returns the valid access token.
 *
 * @param spotifyUserId - The Spotify User ID (providerAccountId)
 * @returns The valid access token string, or null if not available/failed.
 */
export async function getValidSpotifyToken(
  spotifyUserId: string
): Promise<string | null> {
  if (!spotifyUserId) return null

  try {
    const tokenRecord = await prisma.spotifyToken.findUnique({
      where: { spotifyUserId },
    })

    if (!tokenRecord) {
      console.warn(`No Spotify token found for user: ${spotifyUserId}`)
      return null
    }

    // Check expiration (with 60s buffer)
    if (tokenRecord.accessTokenExpiresAt.getTime() > Date.now() + 60000) {
      return tokenRecord.accessToken
    }

    console.log(`Token for user ${spotifyUserId} is expiring, refreshing...`)

    // Refresh Token Logic
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify Client ID or Secret in env')
      return null
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenRecord.refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `Failed to refresh token for ${spotifyUserId}: ${response.status} ${errorText}`
      )
      return null
    }

    const data = (await response.json()) as SpotifyTokenResponse

    // Calculate new expiration
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Update DB atomically
    const updated = await prisma.spotifyToken.update({
      where: { spotifyUserId },
      data: {
        accessToken: data.access_token,
        // Update refresh token if a new one is returned (rotation)
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        accessTokenExpiresAt: newExpiresAt,
      },
    })

    return updated.accessToken
  } catch (error) {
    console.error(`Error in getValidSpotifyToken for ${spotifyUserId}:`, error)
    return null
  }
}
