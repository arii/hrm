import {
  AccessToken,
  SpotifyApi,
  NO_BACKGROUND_REFRESH,
} from '@spotify/web-api-ts-sdk'
import fs from 'fs/promises'
import path from 'path'
import logger from '../../utils/logger'
import { shouldPersistSpotifyTokens } from '../../utils/spotifyTokenPersistence'

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'logs/spotify_tokens.json')

/**
 * A centralized, singleton client for interacting with the Spotify Web API.
 *
 * This class encapsulates the Spotify SDK, manages token persistence (loading, saving),
 * and handles token refresh logic transparently. It provides a single, reliable
 * interface for all Spotify-related features in the application.
 */
export class SpotifyClient {
  private static instance: SpotifyClient

  private sdk: SpotifyApi
  private currentToken: AccessToken | null = null
  private refreshPromise: Promise<void> | null = null

  private constructor(clientId: string, clientSecret: string) {
    this.sdk = SpotifyApi.withClientCredentials(
      clientId,
      clientSecret,
      [],
      {
        // Disable the SDK's built-in background refresh mechanism.
        // We will manage token persistence and refresh manually to ensure
        // it coordinates with our application's lifecycle and persistence layer.
        tokenRefreshStrategy: NO_BACKGROUND_REFRESH,
      }
    )
    this.loadToken().catch((error) => {
      logger.warn({ err: error }, 'Failed to load initial Spotify token.')
    })
  }

  /**
   * Gets the singleton instance of the SpotifyClient.
   *
   * @param {string} clientId - The Spotify client ID.
   * @param {string} clientSecret - The Spotify client secret.
   * @returns {SpotifyClient} The singleton instance.
   */
  public static getInstance(
    clientId: string,
    clientSecret: string
  ): SpotifyClient {
    if (!SpotifyClient.instance) {
      SpotifyClient.instance = new SpotifyClient(clientId, clientSecret)
    }
    return SpotifyClient.instance
  }

  /**
   * Retrieves the underlying Spotify SDK instance, ensuring it is authenticated.
   *
   * If the current token is expired, it will attempt to refresh it before
   * returning the SDK instance.
   *
   * @returns {Promise<SpotifyApi>} A promise that resolves to the authenticated SDK instance.
   */
  public async getSdk(): Promise<SpotifyApi> {
    if (this.isTokenExpired() && this.currentToken?.refresh_token) {
      await this.refreshToken()
    }
    return this.sdk
  }

  /**
   * Checks if the current access token is expired or close to expiring.
   *
   * @returns {boolean} True if the token is expired, false otherwise.
   */
  public isTokenExpired(): boolean {
    if (!this.currentToken) return true
    // Consider the token expired if it's within 60 seconds of its expiry time.
    return Date.now() >= (this.currentToken.expires ?? 0) - 60 * 1000
  }

  /**
   * Sets a new access token and persists it to the file system.
   * This method is the primary way the application provides new tokens
   * (e.g., from an OAuth callback) to the client.
   *
   * @param {AccessToken} token - The new access token.
   */
  public async setToken(token: AccessToken): Promise<void> {
    this.currentToken = token
    this.sdk.setAccessToken(token)
    await this.saveToken()
  }

  /**
   * Loads the access token from the file system and initializes the SDK with it.
   */
  private async loadToken(): Promise<void> {
    try {
      if (shouldPersistSpotifyTokens()) {
        const data = await fs.readFile(TOKEN_FILE_PATH, 'utf8')
        const token = JSON.parse(data) as AccessToken
        this.currentToken = token
        this.sdk.setAccessToken(token)
        logger.info('Successfully loaded Spotify token from persistence.')
      } else {
        logger.info('Spotify token persistence is disabled. Skipping token load.')
      }
    } catch (error) {
      // It's normal for the file not to exist on the first run.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error({ err: error }, 'Error loading Spotify token from file.')
      }
    }
  }

  /**
   * Saves the current access token to the file system if persistence is enabled.
   */
  private async saveToken(): Promise<void> {
    if (this.currentToken && shouldPersistSpotifyTokens()) {
      try {
        await fs.writeFile(
          TOKEN_FILE_PATH,
          JSON.stringify(this.currentToken, null, 2),
          'utf8'
        )
        logger.info('Successfully persisted Spotify token.')
      } catch (error) {
        logger.error({ err: error }, 'Error saving Spotify token to file.')
      }
    }
  }

  /**
   * Refreshes the current access token using the refresh token.
   * This method is synchronized to prevent multiple refresh attempts from occurring simultaneously.
   */
  private async refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        if (!this.currentToken?.refresh_token) {
          throw new Error('No refresh token available.')
        }

        logger.info('Refreshing Spotify access token...')
        const refreshedToken = await this.sdk.refreshAccessToken()
        this.currentToken = refreshedToken
        await this.saveToken()
        logger.info('Successfully refreshed and persisted Spotify token.')
      } catch (error) {
        logger.error({ err: error }, 'Failed to refresh Spotify token.')
        // Clear the token to force re-authentication if refresh fails.
        this.currentToken = null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }
}
