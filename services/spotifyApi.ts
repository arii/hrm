// File: services/spotifyApi.ts
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from './spotifyTokenManager'
import logger from '../utils/logger'

class SpotifyApiService {
  private static instance: SpotifyApiService
  private sdk: SpotifyApi | null = null
  private tokenManager: SpotifyTokenManager
  private sdkInitializationPromise: Promise<void> | null = null

  private constructor() {
    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
    this.sdkInitializationPromise = this.initializeSdk().catch((error) => {
      logger.error('Failed to initialize Spotify SDK on startup:', error)
      // Prevent future retries if initialization fails permanently
      this.sdkInitializationPromise = null
    })
  }

  public static getInstance(): SpotifyApiService {
    if (!SpotifyApiService.instance) {
      SpotifyApiService.instance = new SpotifyApiService()
    }
    return SpotifyApiService.instance
  }

  private async initializeSdk(): Promise<void> {
    const token = await this.tokenManager.getValidAccessToken()
    if (token) {
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        this.setupSdk(sdkToken)
        logger.info('Spotify SDK initialized with stored tokens.')
      }
    } else {
      logger.warn(
        'Could not initialize Spotify SDK: No valid access token found.'
      )
    }
  }

  private setupSdk(accessToken: AccessToken): void {
    this.sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken,
      {
        beforeRequest: (url, init) => {
          logger.debug(`Spotify API Request: ${init.method} ${url}`)
        },
        afterRequest: (url, init, res) => {
          logger.debug(
            `Spotify API Response: ${res.status} for ${init.method} ${url}`
          )
        },
      }
    )
  }

  public async getSdk(): Promise<SpotifyApi> {
    if (this.sdkInitializationPromise) {
      await this.sdkInitializationPromise
    }

    if (this.sdk) {
      // Ensure the token is still valid before returning the SDK instance
      await this.tokenManager.getValidAccessToken()
      const sdkToken = this.tokenManager.getSdkAccessToken()
      if (sdkToken) {
        // The SDK's internal token might be stale, re-initialize with the latest token
        this.setupSdk(sdkToken)
      } else {
        throw new Error('Spotify token is no longer valid.')
      }
    }

    if (!this.sdk) {
      // If initialization failed on startup, retry now
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
    logger.info(
      'Token refresh signaled. Re-initializing Spotify SDK in 2 seconds.'
    )
    // Delay to allow file system to update after token delivery
    await new Promise((resolve) => setTimeout(resolve, 2000))
    this.sdkInitializationPromise = this.initializeSdk()
    await this.sdkInitializationPromise
  }
}

export const spotifyApi = SpotifyApiService.getInstance()
