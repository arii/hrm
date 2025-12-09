import { AccessToken } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenResponse } from './spotifyPolling'
import logger from '../utils/logger'

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
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    // Constructor is now empty, as we are no longer loading from a file.
  }

  /**
   * Sets the current token from a payload delivered by the NextAuth process.
   * @param {SpotifyTokenPayload} payload - The token data.
   */
  public setToken(payload: SpotifyTokenPayload) {
    this.currentToken = {
      receivedAt: Date.now(),
      payload,
    }
    logger.info({ sub: payload.sub }, 'In-memory Spotify token has been set.')
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) {
      logger.warn('Token refresh skipped: no refresh token available.')
      return false
    }

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
      logger.info(
        { status: response.status },
        'Spotify token refresh successful.'
      )

      // Update current token with new values in-memory
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

      logger.info(
        { sub: this.currentToken.payload.sub },
        'Refreshed Spotify token in-memory.'
      )
      return true
    } catch (err) {
      logger.error({ err }, 'Failed to refresh Spotify token')
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.currentToken) return null

    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    // Refresh if within 1 minute of expiry
    if (Date.now() >= expiresAt - 60000) {
      logger.info('Spotify access token is expiring soon, initiating refresh.')

      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken().finally(() => {
          this.refreshPromise = null
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
