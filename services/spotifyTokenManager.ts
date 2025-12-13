import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import * as path from 'path'
import { SpotifyTokenResponse } from './spotifyPolling'

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
        console.log('Loaded Spotify tokens for:', this.currentToken.payload.sub)
      }
    } catch (err) {
      console.warn('Failed to load Spotify tokens:', err)
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

      // Save updated token
      writeTokenFileSafe(this.tokenFile, this.currentToken)

      console.log('Refreshed Spotify token for:', this.currentToken.payload.sub)
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
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

  setTokens(accessToken: AccessToken) {
    if (!this.currentToken) {
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          provider: 'spotify',
          sub: 'unknown',
          access_token: accessToken.access_token,
          refresh_token: accessToken.refresh_token,
          expires_in: accessToken.expires_in,
          scope: accessToken.scope,
          obtainedAt: Date.now(),
        },
      };
    } else {
      this.currentToken.payload.access_token = accessToken.access_token;
      this.currentToken.payload.refresh_token = accessToken.refresh_token;
      this.currentToken.payload.expires_in = accessToken.expires_in;
      this.currentToken.payload.scope = accessToken.scope;
      this.currentToken.payload.obtainedAt = Date.now();
    }
    writeTokenFileSafe(this.tokenFile, this.currentToken);
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
