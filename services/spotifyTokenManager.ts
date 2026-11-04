import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import * as path from 'path'
import { SpotifyTokenResponse } from '../types/core'
import { SPOTIFY_DEFAULT_TOKEN_EXPIRY_S } from '../constants/spotify'
import logger from '../utils/logger.server.js'

/**
 * Helper for atomic writes to prevent file corruption.
 * Writes to a temporary file and then atomically renames it to the final destination.
 * @param {string} filePath - The final path of the file.
 * @param {TokenRecord} data - The data to be serialized to JSON.
 */
const writeTokenFileSafe = (filePath: string, data: TokenRecord) => {
  const tempPath = `${filePath}.tmp`
  try {
    // Ensure the directory exists before writing.
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2))
    fs.renameSync(tempPath, filePath) // Atomic rename
  } catch (error) {
    logger.error(`Failed to write token file safely: ${error}`)
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}

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

/** Client errors are fatal except rate limiting (429), which is retriable. */
function isNonRetriableStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429
}

/** Throws for a failed refresh response, marking fatal statuses. */
function throwForErrorStatus(status: number, body: string): never {
  const fatal = isNonRetriableStatus(status) ? ' (Non-retriable)' : ''
  throw new Error(`HTTP ${status}: ${body}${fatal}`)
}

export class SpotifyTokenManager {
  /**
   * Directly set the access token (for command injection/testing).
   */
  public setAccessToken(token: string) {
    if (this.currentToken) {
      this.currentToken.payload.access_token = token
      this.currentToken.payload.obtainedAt = Date.now()
      writeTokenFileSafe(this.tokenFile, this.currentToken)
      logger.debug('Access token updated via setAccessToken.')
    } else {
      // If no token record exists, create a minimal one
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          provider: 'manual',
          sub: 'manual',
          access_token: token,
          refresh_token: '',
          expires_in: SPOTIFY_DEFAULT_TOKEN_EXPIRY_S,
          scope: '',
          obtainedAt: Date.now(),
        },
      }
      writeTokenFileSafe(this.tokenFile, this.currentToken)
      logger.debug('Access token created via setAccessToken.')
    }
  }

  /**
   * Updates the in-memory token and persists it to disk.
   * @param {SpotifyTokenPayload} payload - The new token payload.
   */
  public updateToken(payload: SpotifyTokenPayload): void {
    this.currentToken = {
      receivedAt: Date.now(),
      payload: payload,
    }
    // Persist for future runs
    writeTokenFileSafe(this.tokenFile, this.currentToken)
    logger.debug(
      'Updated in-memory and persisted Spotify tokens for:',
      this.currentToken.payload.sub
    )
  }
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), 'logs')
  ) {
    this.tokenFile = path.join(logDir, 'spotify_tokens.json')
    this.loadTokens()
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8')
        this.currentToken = JSON.parse(data) as TokenRecord
        logger.debug(
          'Loaded Spotify tokens for:',
          this.currentToken.payload.sub
        )
      }
    } catch (err) {
      logger.warn('Failed to load Spotify tokens:', err)
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false

    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      attempt++
      try {
        const data = await this.attemptTokenRefresh(
          this.currentToken.payload.refresh_token
        )
        this.storeRefreshedToken(data)
        return true
      } catch (error: unknown) {
        const err = error as Error
        if (err.message && err.message.includes('(Non-retriable)')) {
          logger.error('Failed to refresh Spotify token (fatal):', err)
          return false
        }

        logger.error(
          `Failed to refresh Spotify token (attempt ${attempt}/${maxRetries}):`,
          err
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

  /**
   * Single token-refresh attempt. Throws on failure; client errors other
   * than 429 are marked `(Non-retriable)` so the retry loop gives up.
   */
  private async attemptTokenRefresh(
    refreshToken: string
  ): Promise<SpotifyTokenResponse> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64'
    )

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      throwForErrorStatus(response.status, await response.text())
    }

    const data = (await response.json()) as SpotifyTokenResponse
    logger.debug(
      'Spotify token refresh successful. Status:',
      response.status,
      'Body:',
      data
    )
    return data
  }

  /** Merges a refresh response into the current token and persists it. */
  private storeRefreshedToken(data: SpotifyTokenResponse): void {
    if (!this.currentToken) return
    this.currentToken = {
      receivedAt: Date.now(),
      payload: {
        ...this.currentToken.payload,
        access_token: data.access_token,
        expires_in: data.expires_in ?? SPOTIFY_DEFAULT_TOKEN_EXPIRY_S,
        scope: data.scope ?? this.currentToken.payload.scope,
        refresh_token:
          data.refresh_token ?? this.currentToken.payload.refresh_token,
        obtainedAt: Date.now(),
      },
    }
    writeTokenFileSafe(this.tokenFile, this.currentToken)
    logger.debug('Refreshed Spotify token for:', this.currentToken.payload.sub)
  }

  async getValidAccessToken(): Promise<string | null> {
    // Always reload the token file before returning the access token
    this.loadTokens()
    if (!this.currentToken) return null

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
      if (this.currentToken.payload.refresh_token) {
        logger.debug(
          'Spotify access token is expiring soon, initiating refresh...'
        )
        // Refresh if within 1 minute of expiry
        // Ensure only one refresh happens at a time
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshToken()
            .then(() => {
              this.refreshPromise = null
              logger.debug('Spotify access token refresh completed.')
            })
            .catch((error) => {
              this.refreshPromise = null
              logger.error('Spotify access token refresh failed:', error)
            })
        }
        await this.refreshPromise
      } else {
        logger.debug(
          'Spotify access token expired, but no refresh token available. Cannot refresh.'
        )
      }
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
