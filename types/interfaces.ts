import { SpotifyTokenPayload } from '../services/spotifyTokenManager'
import { SpotifyData } from './websocket'
import { SpotifyCommand, SpotifyCommandParameters } from './core'

/**
 * Combined interface for the Spotify service.
 */
export interface SpotifyService {
  /**
   * Returns the current state.
   */
  getState(): SpotifyData

  /**
   * Handles a command.
   */
  handleCommand(
    command: SpotifyCommand,
    params: SpotifyCommandParameters
  ): void | Promise<void>

  /**
   * Checks if the service is ready and initialized.
   */
  isReady(): boolean

  /**
   * Starts the service's polling mechanism, if applicable.
   */
  startPolling?(): void

  /**
   * Stops the service's polling mechanism, if applicable.
   */
  stopPolling?(): void

  /**
   * Cleans up resources used by the service, like intervals or timeouts.
   */
  cleanup?(): void

  /**
   * Handles the reception of new Spotify authentication tokens.
   */
  handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void>

  forcePollAndBroadcast(): void
}
