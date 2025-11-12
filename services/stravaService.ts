import fs from 'fs'
import * as path from 'path'

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  athlete: {
    id: number
  }
}

export interface StravaTokenPayload {
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
  payload: StravaTokenPayload
}

export class StravaTokenManager {
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<void> | null = null

  constructor(
    private clientId: string,
    private clientSecret: string,
    logDir: string = path.resolve(process.cwd(), 'logs')
  ) {
    this.tokenFile = path.join(logDir, 'strava_tokens.json')
    this.loadTokens()
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8')
        this.currentToken = JSON.parse(data) as TokenRecord
        console.log('Loaded Strava tokens for:', this.currentToken.payload.sub)
      }
    } catch (err) {
      console.warn('Failed to load Strava tokens:', err)
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false

    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.currentToken.payload.refresh_token,
        }).toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorBody}`)
      }

      const data = (await response.json()) as StravaTokenResponse
      console.log(
        'Strava token refresh successful. Status:',
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

      console.log('Refreshed Strava token for:', this.currentToken.payload.sub)
      return true
    } catch (err) {
      console.error('Failed to refresh Strava token:', err)
      return false
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.currentToken) return null

    // Check if token needs refresh
    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000

    if (Date.now() >= expiresAt - 60000) {
      console.log(
        'Strava access token is expiring soon, initiating refresh...'
      )
      // Refresh if within 1 minute of expiry
      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken()
          .then(() => {
            this.refreshPromise = null
            console.log('Strava access token refresh completed.')
          })
          .catch((error) => {
            this.refreshPromise = null
            console.error('Strava access token refresh failed:', error)
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
}
