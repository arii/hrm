import { AccessToken } from '@spotify/web-api-ts-sdk'
import { PrismaClient, SpotifyToken } from '@prisma/client'
import { SpotifyTokenResponse } from './spotifyPolling'

export class SpotifyTokenManager {
  private currentToken: SpotifyToken | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string,
    private prisma: PrismaClient
  ) {
    this.loadTokens()
  }

  private async loadTokens() {
    try {
      const token = await this.prisma.spotifyToken.findFirst()
      if (token) {
        this.currentToken = token
        console.log('Loaded Spotify tokens for:', this.currentToken.sub)
      }
    } catch (err) {
      console.warn('Failed to load Spotify tokens:', err)
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
      console.log(
        'Spotify token refresh successful. Status:',
        response.status,
        'Body:',
        data
      )

      const updatedToken = await this.prisma.spotifyToken.update({
        where: { id: this.currentToken.id },
        data: {
          accessToken: data.access_token,
          expiresIn: data.expires_in,
          refreshToken: data.refresh_token ?? this.currentToken.refreshToken,
          obtainedAt: new Date(),
        },
      })

      this.currentToken = updatedToken
      console.log('Refreshed Spotify token for:', this.currentToken.sub)
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    await this.loadTokens()
    if (!this.currentToken) return null

    const expiresAt =
      this.currentToken.obtainedAt.getTime() +
      this.currentToken.expiresIn * 1000

    if (Date.now() >= expiresAt - 60000) {
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

    return this.currentToken.accessToken
  }

  public async setAccessToken(
    token: string,
    userId: string,
    email: string
  ): Promise<void> {
    try {
      const user = await this.prisma.user.upsert({
        where: { email },
        update: {},
        create: { email },
      })

      const tokenData = {
        provider: 'spotify',
        sub: userId,
        accessToken: token,
        refreshToken: '',
        expiresIn: 3600,
        scope: '',
        userId: user.id,
      }

      const updatedToken = await this.prisma.spotifyToken.upsert({
        where: { sub: userId },
        update: tokenData,
        create: tokenData,
      })
      this.currentToken = updatedToken
      console.log('Access token updated via setAccessToken.')
    } catch (error) {
      console.error('Failed to set access token:', error)
    }
  }

  getUserId(): string | null {
    return this.currentToken?.sub ?? null
  }

  getCurrentRefreshToken(): string | null {
    return this.currentToken?.refreshToken ?? null
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null
    return {
      access_token: this.currentToken.accessToken,
      token_type: 'Bearer',
      expires_in: this.currentToken.expiresIn,
      refresh_token: this.currentToken.refreshToken,
      expires:
        this.currentToken.obtainedAt.getTime() +
        this.currentToken.expiresIn * 1000,
    }
  }
}
