import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk'
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
  private clientId: string
  private clientSecret: string

  private constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.sdk = SpotifyApi.withClientCredentials(clientId, clientSecret)

    this.loadToken().catch((error) => {
      logger.warn({ err: error }, 'Failed to load initial Spotify token.')
    })
  }

  public static getInstance(
    clientId: string,
    clientSecret: string
  ): SpotifyClient {
    if (!SpotifyClient.instance) {
      SpotifyClient.instance = new SpotifyClient(clientId, clientSecret)
    }
    return SpotifyClient.instance
  }

  public async getSdk(): Promise<SpotifyApi> {
    if (!this.currentToken) {
      await this.loadToken()
    }

    if (this.isTokenExpired() && this.currentToken?.refresh_token) {
      await this.refreshToken()
    }
    return this.sdk
  }

  public isTokenExpired(): boolean {
    if (!this.currentToken) return true
    const expires = this.currentToken.expires || 0
    return Date.now() >= expires - 60 * 1000
  }

  public async setToken(token: AccessToken): Promise<void> {
    this.currentToken = token
    this.sdk = SpotifyApi.withAccessToken(this.clientId, token)
    await this.saveToken()
  }

  private async loadToken(): Promise<void> {
    try {
      if (shouldPersistSpotifyTokens()) {
        const data = await fs.readFile(TOKEN_FILE_PATH, 'utf8')
        const token = JSON.parse(data) as AccessToken
        this.currentToken = token
        this.sdk = SpotifyApi.withAccessToken(this.clientId, token)
        logger.info('Successfully loaded Spotify token from persistence.')
      } else {
        logger.info(
          'Spotify token persistence is disabled. Skipping token load.'
        )
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error({ err: error }, 'Error loading Spotify token from file.')
      }
    }
  }

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
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.currentToken.refresh_token,
          }),
        })

        if (!response.ok) {
          throw new Error(`Token refresh failed with status ${response.status}`)
        }

        const refreshed = (await response.json()) as Omit<
          AccessToken,
          'expires'
        >
        const refreshedToken: AccessToken = {
          ...refreshed,
          refresh_token:
            refreshed.refresh_token ?? this.currentToken.refresh_token,
          expires: Date.now() + refreshed.expires_in * 1000,
        }

        await this.setToken(refreshedToken)
        logger.info('Successfully refreshed and persisted Spotify token.')
      } catch (error) {
        logger.error({ err: error }, 'Failed to refresh Spotify token.')
        this.currentToken = null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }
}
