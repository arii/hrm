import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import * as path from 'path'
import logger from '../utils/logger.js'

// This response type is from the Spotify API when refreshing a token
export interface SpotifyTokenRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
}

export interface SpotifyTokenPayload {
  provider: string
  sub: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  obtainedAt: number // Timestamp (ms) when the token was obtained
}

export interface TokenRecord {
  receivedAt: number
  payload: SpotifyTokenPayload
}

/**
 * Manages the storage and raw refresh mechanics of Spotify API tokens.
 * It does not decide WHEN to refresh, only HOW.
 */
export class SpotifyTokenManager {
  private tokenFile: string
  private currentToken: TokenRecord | null = null

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), 'logs')
  ) {
    this.tokenFile = path.join(logDir, 'spotify_tokens.json')
    this.loadTokens()
  }

  /**
   * Reloads the token from the filesystem.
   */
  public loadTokens(): void {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8')
        this.currentToken = JSON.parse(data) as TokenRecord
        logger.info(`Loaded Spotify tokens for: ${this.currentToken.payload.sub}`)
      } else {
        this.currentToken = null;
      }
    } catch (err) {
      logger.warn({ err },'Failed to load Spotify tokens')
      this.currentToken = null
    }
  }

  /**
   * Attempts to refresh the access token using the stored refresh token.
   * @returns {Promise<boolean>} - True if the refresh was successful, false otherwise.
   */
  public async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) {
      logger.warn('Cannot refresh Spotify token: No refresh token available.')
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
        throw new Error(`Spotify token refresh failed with HTTP ${response.status}: ${errorBody}`)
      }

      const data = (await response.json()) as SpotifyTokenRefreshResponse
      logger.info('Spotify token refresh successful.')

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

      // Save updated token
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(this.currentToken, null, 2),
        'utf8'
      )

      logger.info(`Refreshed and saved Spotify token for: ${this.currentToken.payload.sub}`)
      return true
    } catch (err) {
      logger.error({ err }, 'Failed to refresh Spotify token')
      return false
    }
  }

  /**
   * Returns the AccessToken object required by the SDK, if a token is present.
   * This method does NOT check for expiration.
   * @returns {AccessToken | null}
   */
  public getSdkAccessToken(): AccessToken | null {
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

  /**
   * Gets the user ID (sub) from the token payload.
   * @returns {string | null}
   */
  public getUserId(): string | null {
    return this.currentToken?.payload.sub ?? null
  }
}
