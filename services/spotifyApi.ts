// File: services/spotifyApi.ts
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import logger from '../utils/logger'
import fs from 'fs'
import * as path from 'path'
import { SpotifyTokenResponse } from './spotifyPolling'

// Interfaces from spotifyTokenManager
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

class SpotifyApiService {
  private static instance: SpotifyApiService
  private sdk: SpotifyApi | null = null
  private sdkInitializationPromise: Promise<void> | null = null

  // Properties from spotifyTokenManager
  private tokenFile: string
  private currentToken: TokenRecord | null = null
  private refreshPromise: Promise<void> | null = null
  private clientId: string
  private clientSecret: string

  private constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    const logDir = path.resolve(process.cwd(), 'logs')
    this.tokenFile = path.join(logDir, 'spotify_tokens.json')
    this.loadTokens()

    this.sdkInitializationPromise = this.initializeSdk().catch((error) => {
      logger.error('Failed to initialize Spotify SDK on startup:', error)
      this.sdkInitializationPromise = null
    })
  }

  public static getInstance(): SpotifyApiService {
    if (!SpotifyApiService.instance) {
      SpotifyApiService.instance = new SpotifyApiService()
    }
    return SpotifyApiService.instance
  }

  // Merged methods from spotifyTokenManager
  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8')
        this.currentToken = JSON.parse(data) as TokenRecord
        logger.info(`Loaded Spotify tokens for: ${this.currentToken.payload.sub}`)
      }
    } catch (err) {
      logger.warn('Failed to load Spotify tokens:', err)
    }
  }

  private async refreshToken(): Promise<void> {
    if (!this.currentToken?.payload.refresh_token) {
      logger.warn('No refresh token available to refresh Spotify token.')
      return
    }

    try {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
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
      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          ...this.currentToken.payload,
          access_token: data.access_token,
          expires_in: data.expires_in,
          refresh_token: data.refresh_token ?? this.currentToken.payload.refresh_token,
          obtainedAt: Date.now(),
        },
      }
      fs.writeFileSync(this.tokenFile, JSON.stringify(this.currentToken, null, 2), 'utf8')
      logger.info(`Refreshed Spotify token for: ${this.currentToken.payload.sub}`)
    } catch (err) {
      logger.error('Failed to refresh Spotify token:', err)
      throw err // Re-throw to be caught by the caller
    }
  }

  private async getValidAccessToken(): Promise<string | null> {
    this.loadTokens()
    if (!this.currentToken) return null

    const expiresAt = this.currentToken.payload.obtainedAt + this.currentToken.payload.expires_in * 1000
    if (Date.now() >= expiresAt - 60000) {
      logger.info('Spotify access token is expiring soon, initiating refresh...')
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken().finally(() => {
          this.refreshPromise = null
        })
      }
      await this.refreshPromise
    }
    return this.currentToken.payload.access_token
  }

  private getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null
    return {
      access_token: this.currentToken.payload.access_token,
      token_type: 'Bearer',
      expires_in: this.currentToken.payload.expires_in,
      refresh_token: this.currentToken.payload.refresh_token,
      expires: this.currentToken.payload.obtainedAt + this.currentToken.payload.expires_in * 1000,
    }
  }

  private async initializeSdk(): Promise<void> {
    const token = await this.getValidAccessToken()
    if (token) {
      const sdkToken = this.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
        logger.info('Spotify SDK initialized with stored tokens.')
      }
    } else {
      logger.warn('Could not initialize Spotify SDK: No valid access token found.')
    }
  }

  private setupSdk(accessToken: AccessToken): void {
    this.sdk = SpotifyApi.withAccessToken(this.clientId, accessToken, {
      beforeRequest: (url, init) => logger.debug(`Spotify API Request: ${init.method} ${url}`),
      afterRequest: (url, init, res) => logger.debug(`Spotify API Response: ${res.status} for ${init.method} ${url}`),
    })
  }

  public async getSdk(): Promise<SpotifyApi> {
    if (this.sdkInitializationPromise) {
      await this.sdkInitializationPromise
    }

    if (this.sdk) {
      await this.getValidAccessToken()
      const sdkToken = this.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
      } else {
        throw new Error('Spotify token is no longer valid.')
      }
    }

    if (!this.sdk) {
      await this.initializeSdk()
      if (!this.sdk) {
        throw new Error('Failed to get Spotify SDK instance.')
      }
    }
    return this.sdk
  }

  public isReady(): boolean {
    return this.sdk !== null
  }

  public async signalTokenRefresh(): Promise<void> {
    logger.info('Token refresh signaled. Re-initializing Spotify SDK in 2 seconds.')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    this.sdkInitializationPromise = this.initializeSdk()
    await this.sdkInitializationPromise
  }
}

export const spotifyApi = SpotifyApiService.getInstance()
