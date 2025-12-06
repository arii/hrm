import { AccessToken } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenResponse } from './spotifyPolling'
import { prisma } from '../lib/prisma.js'

export interface SpotifyTokenPayload {
  provider: string
  sub: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number
}

export interface TokenRecord {
  receivedAt: number
  payload: SpotifyTokenPayload
}

export class SpotifyTokenManager {
  /**
   * Directly set the access token (for command injection/testing).
   */
  public async setAccessToken(token: string) {
    if (this.currentToken) {
      this.currentToken.payload.access_token = token
      this.currentToken.payload.obtainedAt = Date.now()

      try {
        await prisma.spotifyToken.upsert({
          where: { spotifyUserId: this.currentToken.payload.sub },
          create: {
            spotifyUserId: this.currentToken.payload.sub,
            accessToken: token,
            refreshToken: this.currentToken.payload.refresh_token,
            accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          },
          update: {
            accessToken: token,
            accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          },
        })
        console.log('Access token updated via setAccessToken.')
      } catch (e) {
        console.error('Failed to persist token via setAccessToken:', e)
      }
    } else {
      // If no token record exists, create a minimal one
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          provider: 'manual',
          sub: 'manual',
          access_token: token,
          refresh_token: '',
          expires_in: 3600,
          scope: '',
          obtainedAt: Date.now(),
        },
      }
      // Note: Cannot persist 'manual' user safely without ID collision risk or valid refresh token
      console.log(
        'Access token created via setAccessToken (in-memory only for manual).'
      )
    }
  }

  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string,
    // Ignored legacy param
    _logDir?: string
  ) {
    // Initial load happens async now, consumer should ensure wait or retry
    this.loadTokens().catch((e) =>
      console.error('Failed to load tokens on init:', e)
    )
  }

  // Changed to public so it can be called explicitly
  public async loadTokens() {
    try {
      // Find the most recently updated token
      const token = await prisma.spotifyToken.findFirst({
        orderBy: { updatedAt: 'desc' },
      })

      if (token) {
        this.currentToken = {
          receivedAt: token.updatedAt.getTime(),
          payload: {
            provider: 'spotify',
            sub: token.spotifyUserId,
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            expires_in: Math.max(
              0,
              Math.floor(
                (token.accessTokenExpiresAt.getTime() - Date.now()) / 1000
              )
            ),
            scope: '', // Scope not currently stored in DB, simplified
            obtainedAt: Date.now(), // Approximation
          },
        }
        console.log('Loaded Spotify tokens for:', this.currentToken.payload.sub)
      }
    } catch (err) {
      console.warn('Failed to load Spotify tokens from DB:', err)
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false

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
          refresh_token: this.currentToken.payload.refresh_token,
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

      // Update current token with new values
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          ...this.currentToken.payload,
          access_token: data.access_token,
          expires_in: data.expires_in,
          refresh_token:
            data.refresh_token ?? this.currentToken.payload.refresh_token,
          obtainedAt: Date.now(),
        },
      }

      // Save updated token to DB
      const userId = this.currentToken.payload.sub
      if (userId && userId !== 'manual') {
        await prisma.spotifyToken.update({
          where: { spotifyUserId: userId },
          data: {
            accessToken: data.access_token,
            ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
            accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
          },
        })
        console.log('Refreshed Spotify token persisted for:', userId)
      }

      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    // Refresh state from DB to ensure we have latest (e.g. from NextAuth login)
    await this.loadTokens()

    if (!this.currentToken) return null

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
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

    return this.currentToken.payload.access_token
  }

  getUserId(): string | null {
    return this.currentToken?.payload.sub ?? null
  }

  getCurrentRefreshToken(): string | null {
    return this.currentToken?.payload.refresh_token ?? null
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null
    return {
      access_token: this.currentToken.payload.access_token,
      token_type: 'Bearer',
      expires_in: this.currentToken.payload.expires_in,
      refresh_token: this.currentToken.payload.refresh_token,
      expires:
        this.currentToken.payload.obtainedAt +
        this.currentToken.payload.expires_in * 1000,
    }
  }
}
