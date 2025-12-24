import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import * as path from 'path'
import { SpotifyTokenPayloadSchema } from '../lib/validation/schemas.js'
import { SpotifyTokenResponse } from './spotifyPolling.js'

/**
 * Helper for atomic writes to prevent file corruption.
 * Writes to a temporary file and then atomically renames it to the final destination.
 * @param {string} filePath - The final path of the file.
 * @param {TokenRecord} data - The data to be serialized to JSON.
 */
const writeTokenFileSafe = (filePath: string, data: TokenRecord) => {
  const tempPath = `${filePath}.tmp`
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2))
    fs.renameSync(tempPath, filePath) // Atomic rename
  } catch (error) {
    console.error(`Failed to write token file safely: ${error}`)
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

export class SpotifyTokenManager {
  /**
   * Directly set the access token (for command injection/testing).
   */
  public setAccessToken(token: string) {
    if (this.currentToken) {
      this.currentToken.payload.access_token = token
      this.currentToken.payload.obtainedAt = Date.now()
      writeTokenFileSafe(this.tokenFile, this.currentToken)
      console.log('Access token updated via setAccessToken.')
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
      writeTokenFileSafe(this.tokenFile, this.currentToken)
      console.log('Access token created via setAccessToken.')
    }
  }

  /**
   * Updates the in-memory token and persists it to disk.
   * @param {SpotifyTokenPayload} payload - The new token payload.
   */
  public updateToken(payload: SpotifyTokenPayload): void {
    try {
      const validatedPayload = SpotifyTokenPayloadSchema.parse(payload)
      this.currentToken = {
        receivedAt: Date.now(),
        payload: validatedPayload,
      }
      // Persist for future runs
      writeTokenFileSafe(this.tokenFile, this.currentToken)
      console.log(
        'Updated in-memory and persisted Spotify tokens for:',
        this.currentToken.payload.sub
      )
    } catch (err) {
      console.error(
        'Failed to update token due to validation error or invalid format:',
        err,
        'Invalid payload:',
        payload
      )
    }
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
        const jsonData = JSON.parse(data)

        // Validate the payload using the Zod schema
        const validatedPayload = SpotifyTokenPayloadSchema.parse(jsonData.payload)

        this.currentToken = {
          receivedAt: jsonData.receivedAt,
          payload: validatedPayload,
        }
        console.log(
          'Loaded and validated Spotify tokens for:',
          this.currentToken.payload.sub
        )
      }
    } catch (err) {
      console.warn(
        'Failed to load or validate Spotify tokens:',
        err,
        'Raw data:',
        fs.existsSync(this.tokenFile)
          ? fs.readFileSync(this.tokenFile, 'utf8')
          : 'File not found'
      )
      this.currentToken = null // Ensure corrupt token isn't used
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false

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
          // Don't retry client errors (4xx) unless it's rate limiting (429)
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

        // Save updated token
        writeTokenFileSafe(this.tokenFile, this.currentToken)

        console.log(
          'Refreshed Spotify token for:',
          this.currentToken.payload.sub
        )
        return true
      } catch (error: unknown) {
        const err = error as Error
        if (err.message && err.message.includes('(Non-retriable)')) {
          console.error('Failed to refresh Spotify token (fatal):', err)
          return false
        }

        console.error(
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
      } else {
        console.log(
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
