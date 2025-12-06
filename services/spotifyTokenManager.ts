import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import * as path from 'path'
import { EncryptionService } from '../utils/encryption.js'
import { SpotifyTokenResponse } from './spotifyPolling.js'

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
      this.saveTokens()
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
      this.saveTokens()
      console.log('Access token created via setAccessToken.')
    }
  }
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<boolean> | null = null
  private encryptionService: EncryptionService | null = null

  /**
   * Updates the in-memory token from a raw payload and persists it.
   * This is the new primary way to update tokens from the NextAuth flow.
   * @param payload The raw token payload from the OAuth provider.
   */
  public setTokenPayload(payload: unknown) {
    // Basic validation to ensure the payload is a usable object
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('access_token' in payload) ||
      !('refresh_token' in payload)
    ) {
      console.error(
        '[SpotifyTokenManager] Invalid token payload received:',
        payload
      )
      return
    }

    this.currentToken = {
      receivedAt: Date.now(),
      // We cast here after verifying the essential fields exist.
      // A more robust solution might use a validation library like Zod.
      payload: payload as SpotifyTokenPayload,
    }

    // Ensure `obtainedAt` is set if not provided by the payload
    if (!this.currentToken.payload.obtainedAt) {
      this.currentToken.payload.obtainedAt = this.currentToken.receivedAt
    }

    console.log(
      `[SpotifyTokenManager] Set new token payload for: ${this.currentToken.payload.sub}`
    )
    this.saveTokens()
  }

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), 'logs')
  ) {
    this.tokenFile = path.join(logDir, 'spotify_tokens.json')
    if (process.env.ENCRYPTION_KEY) {
      this.encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY)
    } else {
      console.warn(
        'ENCRYPTION_KEY is not set. Spotify tokens will not be persisted.'
      )
    }
    this.loadTokens()
  }

  private loadTokens() {
    if (!this.encryptionService) return
    try {
      if (fs.existsSync(this.tokenFile)) {
        const encryptedData = fs.readFileSync(this.tokenFile, 'utf8')
        const decryptedData = this.encryptionService.decrypt(encryptedData)
        this.currentToken = JSON.parse(decryptedData) as TokenRecord
        console.log('Loaded Spotify tokens for:', this.currentToken.payload.sub)
      }
    } catch (err) {
      console.warn('Failed to load Spotify tokens:', err)
      // If decryption fails, the file might be corrupt. Delete it.
      fs.unlinkSync(this.tokenFile)
    }
  }

  private saveTokens() {
    if (!this.encryptionService || !this.currentToken) return
    try {
      const data = JSON.stringify(this.currentToken, null, 2)
      const encryptedData = this.encryptionService.encrypt(data)
      fs.writeFileSync(this.tokenFile, encryptedData, 'utf8')
    } catch (err) {
      console.error('Failed to save Spotify tokens:', err)
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

      this.saveTokens()

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
