// File: services/spotifyTokenManager.ts
import { AccessToken } from '@spotify/web-api-ts-sdk'
import fs from 'fs'
import path from 'path'

const TOKEN_FILE_PATH = path.join(process.cwd(), 'logs', 'spotify_tokens.json')

/**
 * Manages the lifecycle of a Spotify access token, including loading, saving,
 * and refreshing it.
 */
export class SpotifyTokenManager {
  private token: AccessToken | null = null
  private clientId: string
  private clientSecret: string

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    this.loadToken()
  }

  /**
   * Loads the token from the file system.
   */
  private loadToken() {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const rawData = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8')
        this.token = JSON.parse(rawData) as AccessToken
      }
    } catch (error) {
      console.error('Error loading Spotify token:', error)
      this.token = null
    }
  }

  /**
   * Saves the token to the file system.
   */
  private saveToken() {
    try {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(this.token))
    } catch (error) {
      console.error('Error saving Spotify token:', error)
    }
  }

  /**
   * Returns a valid access token, refreshing it if necessary.
   */
  public async getValidAccessToken(): Promise<AccessToken | null> {
    if (!this.token) {
      return null
    }

    // Check if the token is expired or about to expire (within 5 minutes)
    const buffer = 300 // 5 minutes in seconds
    const isExpired =
      new Date().getTime() >
      (this.token.expires ?? 0) - buffer * 1000

    if (isExpired) {
      await this.refreshToken()
    }

    return this.token
  }

  /**
   * Refreshes the access token using the refresh token.
   */
  private async refreshToken() {
    if (!this.token || !this.token.refresh_token) {
      console.error('No refresh token available to refresh the access token.')
      return
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(this.clientId + ':' + this.clientSecret).toString(
              'base64'
            ),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.token.refresh_token,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`)
      }

      const newAccessToken = (await response.json()) as AccessToken
      // Spotify's refresh response doesn't include a new refresh token, so we must preserve the old one.
      newAccessToken.refresh_token =
        newAccessToken.refresh_token || this.token.refresh_token
      this.token = newAccessToken
      this.saveToken()
      console.log('Successfully refreshed Spotify token.')
    } catch (error) {
      console.error('Error refreshing Spotify token:', error)
    }
  }

  /**
   * Returns the raw SDK access token.
   */
  public getSdkAccessToken(): AccessToken | null {
    return this.token
  }

  /**
   * Sets a new access token and saves it.
   */
  public setAccessToken(token: AccessToken) {
    this.token = token
    this.saveToken()
  }
}
