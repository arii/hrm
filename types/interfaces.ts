<<<<<<< HEAD
// File: types/interfaces.ts
/**
 * Defines common interfaces for services to promote consistency and enable
 * dependency inversion (the "D" in SOLID). By depending on these abstractions
 * rather than concrete implementations, consuming code becomes more modular,
t* estable, and easier to refactor.
 */

import { SpotifyTokenPayload } from '@/services/spotifyTokenManager'
import { SpotifyData } from '@/types/websocket'
import { SpotifyCommand } from '@/types/core'
=======
import { SpotifyTokenPayload } from '../services/spotifyTokenManager'
import { SpotifyData } from './websocket'
import { SpotifyCommand, SpotifyCommandParameters } from './core'
>>>>>>> origin/leader

/**
 * Defines the unified interface for the Spotify service.
 * This interface consolidates state access, command handling, and lifecycle management
 * into a single cohesive definition, avoiding unnecessary abstraction layers.
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
