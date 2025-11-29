import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from './spotifyTokenManager.js'
import logger from '../utils/logger.js'

/**
 * A singleton service to manage the Spotify API client.
 */
export class SpotifyApiService {
  private static instance: SpotifyApiService
  private sdk: SpotifyApi | null = null
  private tokenManager: SpotifyTokenManager
  private clientId: string
  private clientSecret: string

  private constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    this.tokenManager = new SpotifyTokenManager(this.clientId, this.clientSecret)
  }

  public static getInstance(): SpotifyApiService {
    if (!SpotifyApiService.instance) {
      SpotifyApiService.instance = new SpotifyApiService()
    }
    return SpotifyApiService.instance
  }

  public async initialize(): Promise<void> {
    const token = this.tokenManager.getSdkAccessToken()
    if (token) {
      this.setupSdk(token)
      logger.info('Spotify API Service initialized with existing token.')
    } else {
      logger.info('No existing Spotify token found.')
    }
  }

  private setupSdk(token: AccessToken): void {
    this.sdk = SpotifyApi.withAccessToken(this.clientId, token)
  }

  public getSdk(): SpotifyApi | null {
    return this.sdk
  }

  public getTokenManager(): SpotifyTokenManager {
    return this.tokenManager
  }

  public async setRefreshToken(_token: string): Promise<void> {
    // This method is now a signal to re-initialize
    logger.debug('Spotify Refresh Token signal received. Re-initializing SDK.')
    this.tokenManager.loadTokens()
    const accessToken = this.tokenManager.getSdkAccessToken()
    if (accessToken) {
      this.setupSdk(accessToken)
    }
  }
}
