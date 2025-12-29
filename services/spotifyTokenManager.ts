import { AccessToken } from '@spotify/web-api-ts-sdk'
import { z } from 'zod'
import { SpotifyTokenResponse } from './spotifyPolling.js'
import logger from '../utils/logger.js'

/**
 * Zod schema for the Spotify token payload.
 * This provides runtime validation to ensure that the token data, which comes
 * from an external source (NextAuth's JWT), conforms to the expected shape.
 * This is a critical safeguard against unexpected data structures or types
 * that could cause runtime errors.
 */
const SpotifyTokenPayloadSchema = z.object({
  provider: z.string(),
  sub: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
  obtainedAt: z.number(),
})

export type SpotifyTokenPayload = z.infer<typeof SpotifyTokenPayloadSchema>

export interface TokenRecord {
  receivedAt: number
  payload: SpotifyTokenPayload
}

/**
 * In-memory manager for Spotify tokens.
 * This relies on external "hydration" (via UI or Auth callbacks) to populate the token.
 * It does not persist to disk, making it suitable for serverless/containerized environments.
 */
export class SpotifyTokenManager {
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  /**
   * Updates the in-memory token.
   * @param {SpotifyTokenPayload} payload - The new token payload.
   */
  public updateToken(payload: unknown): void {
    const validation = SpotifyTokenPayloadSchema.safeParse(payload)
    if (!validation.success) {
      logger.error({ error: validation.error }, 'Invalid Spotify token payload received.')
      return
    }

    this.currentToken = {
      receivedAt: Date.now(),
      payload: validation.data,
    }
    logger.info({ userId: this.currentToken.payload.sub }, 'Updated in-memory Spotify tokens.')
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) {
        logger.warn({ userId: this.currentToken?.payload.sub }, 'Token refresh skipped: No refresh token available.');
        return false;
    }
    const userId = this.currentToken.payload.sub

    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      attempt++
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
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            throw new Error(
              `HTTP ${response.status}: ${errorBody} (Non-retriable)`
            )
          }
          throw new Error(`HTTP ${response.status}: ${errorBody}`)
        }

        const data = (await response.json()) as SpotifyTokenResponse
        logger.info({ userId }, 'Spotify token refresh successful.')

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

        return true
      } catch (error: unknown) {
        const err = error as Error
        if (err.message && err.message.includes('(Non-retriable)')) {
            logger.error({ userId, error: err.message }, 'Failed to refresh Spotify token (fatal). The refresh token may be revoked.');
            return false
        }

        logger.warn(
          { userId, attempt, maxRetries, error: err.message },
          `Failed to refresh Spotify token (attempt ${attempt}/${maxRetries}). Retrying...`
        )
        if (attempt >= maxRetries) return false
        // Exponential backoff
        await new Promise((res) =>
          setTimeout(res, 1000 * Math.pow(2, attempt - 1))
        )
      }
    }
    return false
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.currentToken) return null

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
        if (this.currentToken.payload.refresh_token) {
            if (!this.refreshPromise) {
                logger.info({ userId: this.currentToken.payload.sub }, 'Spotify access token is expiring soon, initiating refresh...');
                this.refreshPromise = this.refreshToken().finally(() => {
                    this.refreshPromise = null;
                });
            }
            await this.refreshPromise;
        } else {
            logger.warn(
                { userId: this.currentToken.payload.sub },
              'Spotify access token expired, but no refresh token available. Cannot refresh.'
            )
        }
    }

    return this.currentToken.payload.access_token
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
