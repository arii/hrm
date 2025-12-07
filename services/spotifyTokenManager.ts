import { AccessToken } from '@spotify/web-api-ts-sdk'
import { PrismaClient, SpotifyToken } from '@prisma/client'
import { SpotifyTokenResponse } from './spotifyPolling'

// This interface comes from the auth callback
export interface SpotifyTokenPayload {
  provider: string
  sub: string // This is the spotifyUserId
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number // Milliseconds timestamp
}

export class SpotifyTokenManager {
  private prisma: PrismaClient
  private currentToken: SpotifyToken | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    this.prisma = new PrismaClient()
  }

  // New method to handle token delivery from auth callback
  public async saveToken(tokenData: SpotifyTokenPayload): Promise<void> {
    const expiresAt = new Date(tokenData.obtainedAt + tokenData.expires_in * 1000)

    const token = await this.prisma.spotifyToken.upsert({
      where: { spotifyUserId: tokenData.sub },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: expiresAt,
        scope: tokenData.scope,
      },
      create: {
        spotifyUserId: tokenData.sub,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accessTokenExpiresAt: expiresAt,
        scope: tokenData.scope,
      },
    })

    // Set the current token to the newly saved one
    this.currentToken = token
    console.log('Saved Spotify token for:', token.spotifyUserId)
  }

  /**
   * Loads the first available token from the database.
   * This maintains the single-user-system assumption of the old implementation.
   */
  private async loadToken(): Promise<void> {
    try {
      // Only load from DB if not already in memory to avoid unnecessary queries
      if (!this.currentToken) {
        const tokenFromDb = await this.prisma.spotifyToken.findFirst()
        if (tokenFromDb) {
          this.currentToken = tokenFromDb
          console.log('Loaded Spotify token from DB for:', this.currentToken.spotifyUserId)
        }
      }
    } catch (err) {
      console.warn('Failed to load Spotify token from DB:', err)
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.refreshToken) return false

    try {
      const basic = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.currentToken.refreshToken,
        }).toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorBody}`)
      }

      const data = (await response.json()) as SpotifyTokenResponse

      const expiresAt = new Date(Date.now() + data.expires_in * 1000)

      const updatedToken = await this.prisma.spotifyToken.update({
        where: { id: this.currentToken.id },
        data: {
          accessToken: data.access_token,
          // Spotify sometimes returns a new refresh token
          refreshToken: data.refresh_token ?? this.currentToken.refreshToken,
          accessTokenExpiresAt: expiresAt,
        },
      })

      this.currentToken = updatedToken

      console.log('Refreshed Spotify token for:', this.currentToken.spotifyUserId)
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    await this.loadToken()
    if (!this.currentToken) return null

    // Check if token needs refresh
    const expiresAt = this.currentToken.accessTokenExpiresAt.getTime()

    if (Date.now() >= expiresAt - 60000) { // 1 minute buffer
      console.log(
        'Spotify access token is expiring soon, initiating refresh...'
      )
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

    return this.currentToken?.accessToken ?? null
  }

  getUserId(): string | null {
    return this.currentToken?.spotifyUserId ?? null
  }

  getCurrentRefreshToken(): string | null {
    return this.currentToken?.refreshToken ?? null
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null

    const expiresIn = Math.round((this.currentToken.accessTokenExpiresAt.getTime() - Date.now()) / 1000)

    return {
      access_token: this.currentToken.accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: this.currentToken.refreshToken,
      // The SDK wants an absolute timestamp in ms for expires.
      expires: this.currentToken.accessTokenExpiresAt.getTime(),
    }
  }

  /**
   * Directly set the access token (for command injection/testing).
   */
  public async setAccessToken(token: string, userId: string = 'manual'): Promise<void> {
    const expiresAt = new Date(Date.now() + 3600 * 1000) // Assume 1 hour expiry
    const upsertedToken = await this.prisma.spotifyToken.upsert({
        where: { spotifyUserId: userId },
        update: {
            accessToken: token,
            accessTokenExpiresAt: expiresAt,
        },
        create: {
            spotifyUserId: userId,
            accessToken: token,
            refreshToken: 'manual_refresh_token', // needs a placeholder
            accessTokenExpiresAt: expiresAt,
            scope: 'manual_scope',
        }
    })
    this.currentToken = upsertedToken;
    console.log(`Access token updated/created for user ${userId} via setAccessToken.`)
  }
}
