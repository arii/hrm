// File: types/interfaces.ts
/**
 * Defines common interfaces for services to promote consistency and enable
 * dependency inversion (the "D" in SOLID). By depending on these abstractions
 * rather than concrete implementations, consuming code becomes more modular,
t* estable, and easier to refactor.
 */

import { SpotifyTokenPayload } from '../services/spotifyTokenManager'
import { SpotifyData } from './websocket'

/**
 * Represents a service that provides a snapshot of its current state.
 * @template T The type of the state object.
 */
export interface StateProvider<T> {
  /**
   * Returns the current state.
   * @returns {T} The state object.
   */
  getState(): T
}

/**
 * Represents a service that can handle specific commands.
 * @template C The type representing the command identifier (e.g., a string union).
 * @template P The type representing the command payload or parameters.
 */
export interface CommandHandler<C, P> {
  /**
   * Handles a command.
   * @param {C} command - The command to handle.
   * @param {P} params - The command parameters.
   */
  handleCommand(command: C, params: P): void | Promise<void>
}

/**
 * Defines the basic lifecycle methods for a service, such as starting,
 * stopping, and cleaning up resources.
 */
export interface Lifecycle {
  /**
   * Starts the service's polling mechanism, if applicable.
   */
  startPolling?(): void
  /**
   * Stops the service's polling mechanism, if applicable.
   */
  stopPolling?(): void
  /**
   * Checks if the service is ready and initialized.
   * @returns {boolean} True if the service is ready, false otherwise.
   */
  isReady(): boolean
  /**
   * Cleans up resources used by the service, like intervals or timeouts.
   */
  cleanup?(): void
}

/**
 * Interface for services that handle Spotify token updates.
 */
export interface SpotifyTokenHandler {
  /**
   * Handles the reception of new Spotify authentication tokens.
   * @param {SpotifyTokenPayload} tokens - The new token payload.
   * @returns {Promise<void>}
   */
  handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void>
}

// --- Domain-Specific Types ---

/**
 * Defines the set of valid commands that can be sent to the Spotify service.
 */
export type SpotifyCommand =
  | 'PLAY'
  | 'PAUSE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'SET_VOLUME'
  | 'TRANSFER_PLAYBACK'
  | 'GET_DEVICES'
  | 'LOGIN' // Kept for legacy or future use

// --- Composite Service Interfaces ---

/**
 * Combined interface for the Spotify service, adhering to ISP.
 * Consumers can depend on this, or on one of the more granular interfaces.
 */
export type SpotifyService = StateProvider<SpotifyData> &
  CommandHandler<
    SpotifyCommand,
    {
      deviceId?: string
      volume?: number
      playlistUri?: string
    }
  > &
  Lifecycle &
  SpotifyTokenHandler
