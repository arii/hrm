import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from './spotifyTokenManager'
import logger from '../utils/logger'

class SpotifyClient {
  private tokenManager: SpotifyTokenManager
  private sdk: SpotifyApi | null = null

  constructor() {
    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
  }

  /**
   * Retrieves an authenticated Spotify SDK instance.
   * Initializes or refreshes tokens automatically if needed.
   */
  public async getSdk(): Promise<SpotifyApi | null> {
    // 1. If we already have an SDK instance, check if token is stale (handled by TokenManager)
    // Actually, TokenManager.getValidAccessToken() handles the "check and refresh" logic.
    // We should call it to ensure the file/state is fresh.
    const tokenStr = await this.tokenManager.getValidAccessToken()

    if (!tokenStr) {
      logger.warn('[SpotifyClient] No valid token available.')
      return null
    }

    // 2. If SDK exists, we might need to update its token if it changed
    // The SDK instance is immutable regarding the strategy usually, but we can re-instantiate
    // or assume the AccessToken object passed initially is static.
    // Best practice with this custom file-based manager is to re-create or use withAccessToken
    // if we suspect change, OR just trust the manager returned a valid string.

    // For simplicity and robustness with the file-system manager:
    const sdkToken = this.tokenManager.getSdkAccessToken()
    if (!sdkToken) return null

    // We create a lightweight instance for this operation.
    // The SDK is designed to be stateless regarding HTTP connections.
    return SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      sdkToken
    )
  }

  /**
   * Helper to execute a command against the System Player
   */
  public async executeCommand(
    action: (sdk: SpotifyApi) => Promise<void>,
    commandName: string
  ): Promise<boolean> {
    const sdk = await this.getSdk()
    if (!sdk) {
      logger.error(`[SpotifyClient] Cannot execute ${commandName}: SDK not ready`)
      return false
    }

    try {
      await action(sdk)
      return true
    } catch (error: unknown) {
      // Robust error handling for non-JSON responses (common with Spotify 204s)
      this.handleSpotifyError(error, commandName)
      return false
    }
  }

  private handleSpotifyError(error: unknown, context: string) {
    // Re-use the robust error logging logic you developed in Polling
    if (error instanceof SyntaxError) {
      // Suppress 204 empty body parsing errors
      return
    }

    const errObj = error as { status?: number; message?: string }
    if (errObj?.status === 401) {
      logger.warn(`[SpotifyClient] 401 Unauthorized during ${context}. Token might be desynced.`)
      // TokenManager will catch this on next getValidAccessToken call
    } else {
      logger.error({ err: error }, `[SpotifyClient] Error executing ${context}`)
    }
  }
}

// Export a singleton
export const spotifyClient = new SpotifyClient()