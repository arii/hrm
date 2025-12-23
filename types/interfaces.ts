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
  getState(): T
}

/**
 * Represents a service that can handle specific commands.
 * @template C The type representing the command identifier (e.g., a string union).
 * @template P The type representing the command payload or parameters.
 */
export interface CommandHandler<C, P> {
  handleCommand(command: C, params: P): void | Promise<void>
}

/**
 * Defines the basic lifecycle methods for a service, such as starting,
 * stopping, and cleaning up resources.
 */
export interface Lifecycle {
  startPolling?(): void
  stopPolling?(): void
  isReady(): boolean
  cleanup?(): void
}

/**
 * Interface for services that handle Spotify token updates.
 */
export interface SpotifyTokenHandler {
  handleTokenUpdate(tokens: SpotifyTokenPayload): Promise<void>
}

// --- Composite Service Interfaces ---

/**
 * Combined interface for the Spotify service, adhering to ISP.
 * Consumers can depend on this, or on one of the more granular interfaces.
 */
export type SpotifyService = StateProvider<SpotifyData> &
  CommandHandler<
    string, // Assuming command is a string for simplicity
    {
      deviceId?: string
      volume?: number
      playlistUri?: string
    }
  > &
  Lifecycle &
  SpotifyTokenHandler
