import prismaPkg from '@prisma/client'
import type { SpotifyToken } from '@prisma/client'
import { AccessToken } from '@spotify/web-api-ts-sdk'

const { PrismaClient } = prismaPkg
const prisma = new PrismaClient()

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

// We can simplify this class significantly if we only have one user/token to manage.
export class SpotifyTokenManager {
  // Use a simple in-memory cache to reduce DB load
  private inMemoryToken: SpotifyToken | null = null
  private refreshPromise: Promise<void> | null = null
  private userId: string | null = null // Store the User ID we are managing

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    // We expect the first token delivery to set the user ID.
  }

  // Initial load or periodic check
  public async loadToken(userId: string): Promise<void> {
    this.userId = userId
    this.inMemoryToken = await prisma.spotifyToken.findUnique({
      where: { spotifyUserId: userId },
    })
    if (this.inMemoryToken) {
      console.log('Loaded Spotify token from DB for:', userId)
    } else {
      console.warn('No token found in DB for:', userId)
    }
  }

  private async writeTokenUpdate(data: Partial<SpotifyToken>): Promise<void> {
    if (!this.userId) return
    const updatedToken = await prisma.spotifyToken.update({
      where: { spotifyUserId: this.userId },
      data: data,
    })
    // Update in-memory cache immediately
    this.inMemoryToken = updatedToken
  }

  // Refactored to use the database as source/destination
  private async refreshToken(): Promise<boolean> {
    if (!this.inMemoryToken?.refreshToken) return false

    try {
      const basic = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')

      const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.inMemoryToken.refreshToken,
        }).toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorBody}`)
      }

      const data = (await response.json()) as {
        access_token: string
        expires_in: number
        refresh_token?: string
      }

      // Update DB with new token data
      await this.writeTokenUpdate({
        accessToken: data.access_token,
        accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        refreshToken: data.refresh_token ?? null, // Spotify may rotate the refresh token
        updatedAt: new Date(),
      })
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  public async getValidAccessToken(): Promise<string | null> {
    if (!this.inMemoryToken) return null

    const expiresAtMs = this.inMemoryToken.accessTokenExpiresAt.getTime()

    // Check expiry: 60-second buffer
    if (Date.now() >= expiresAtMs - 60000) {
      console.log(
        'Spotify access token is expiring soon, initiating refresh...'
      )
      // Refresh if within 1 minute of expiry
      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken()
          .then(() => {
            this.refreshPromise = null
            console.log('Spotify access token refresh completed.')
          })
          .catch((error) => {
            this.refreshPromise = null
            console.error('Spotify access token refresh failed:', error)
          })
      }
      await this.refreshPromise
    }

    return this.inMemoryToken.accessToken
  }

  getUserId(): string | null {
    return this.userId
  }

  getCurrentRefreshToken(): string | null {
    return this.inMemoryToken?.refreshToken ?? null
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.inMemoryToken) return null
    const expiresIn =
      (this.inMemoryToken.accessTokenExpiresAt.getTime() - Date.now()) / 1000
    return {
      access_token: this.inMemoryToken.accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: this.inMemoryToken.refreshToken ?? '',
      expires: this.inMemoryToken.accessTokenExpiresAt.getTime(),
    }
  }
}
