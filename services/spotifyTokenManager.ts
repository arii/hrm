// services/spotifyTokenManager.ts
import fs from 'fs'
import * as path from 'path'
import { SpotifyTokenResponse } from '../types/spotify'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'logs/spotify_token.json')

export class SpotifyTokenManager {
  private clientId: string
  private clientSecret: string
  private refreshToken: string | null = null
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    this.loadTokenFromFile()
  }

  private loadTokenFromFile() {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf8')
        const tokenData = JSON.parse(data)
        this.refreshToken = tokenData.refresh_token
        this.accessToken = tokenData.access_token
        this.tokenExpiresAt = tokenData.expires_at
        console.log('Loaded Spotify token from file.')
      }
    } catch (err) {
      console.warn('Failed to load Spotify token from file:', err)
    }
  }

  private saveTokenToFile() {
    if (!this.refreshToken) return
    const tokenData = {
      refresh_token: this.refreshToken,
      access_token: this.accessToken,
      expires_at: this.tokenExpiresAt,
    }
    try {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2))
      console.log('Saved Spotify token to file.')
    } catch (err) {
      console.error('Failed to save Spotify token to file:', err)
    }
  }

  public setRefreshToken(token: string): void {
    this.refreshToken = token
    this.saveTokenToFile()
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      console.error('Cannot refresh: No refresh token is available.')
      return null
    }

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64'
    )

    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = (await response.json()) as SpotifyTokenResponse
      this.accessToken = data.access_token
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000

      // A new refresh token might be issued, update if so
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token
      }

      this.saveTokenToFile()
      console.log('Successfully refreshed Spotify access token.')
      return this.accessToken
    } catch (error) {
      console.error('Error refreshing Spotify token:', error)
      this.accessToken = null
      return null
    }
  }

  public async getValidAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }
    console.log('Access token is expired or missing, refreshing...')
    return this.refreshAccessToken()
  }

  public getCurrentRefreshToken(): string | null {
    return this.refreshToken
  }
}
