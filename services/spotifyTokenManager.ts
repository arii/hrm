import fs from 'fs'
import * as path from 'path'
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
    console.log('[SpotifyTokenManager] Attempting to refresh token...')
    if (!this.currentToken?.payload.refresh_token) {
      console.error(
        '[SpotifyTokenManager] refreshToken failed: No refresh token available.'
      )
      return false
    }

    try {
      const basic = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')

      console.log(
        '[SpotifyTokenManager] Sending token refresh request to Spotify.'
      )
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
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(this.currentToken, null, 2),
        'utf8'
      )

      console.log('Refreshed Spotify token for:', this.currentToken.payload.sub)
      return true
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.currentToken) {
      console.warn(
        '[SpotifyTokenManager] getValidAccessToken failed: No token loaded.'
      )
      return null
    }

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000
    const timeLeft = expiresAt - Date.now()
    console.log(
      `[SpotifyTokenManager] Token expires in ${Math.round(timeLeft / 1000)} seconds.`
    )

    if (timeLeft <= 60000) {
      console.log(
        'Spotify access token is expiring soon, initiating refresh...'
      )
      // Refresh if within 1 minute of expiry
      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        console.log('[SpotifyTokenManager] Creating new refresh promise.')
        this.refreshPromise = this.refreshToken()
          .then(() => {
            this.refreshPromise = null
            console.log('Spotify access token refresh completed.')
          })
          .catch((error) => {
            this.refreshPromise = null
            console.error('Spotify access token refresh failed:', error)
          })
      } else {
        console.log(
          '[SpotifyTokenManager] Refresh promise already exists, awaiting completion.'
        )
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

  public async forceRefreshToken(): Promise<boolean> {
    console.log('[SpotifyTokenManager] Force refresh initiated via API.')
    return await this.refreshToken()
  }
}
