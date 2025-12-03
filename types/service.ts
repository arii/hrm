// File: types/service.ts
/**
 * Description: Defines the common interfaces for all background services in the application.
 * This ensures a consistent lifecycle and API for managing services like SpotifyPolling and TabataTimer.
 */

import { TimerData, SpotifyData } from './websocket'

/**
 * The base interface for any background service.
 * Defines the essential lifecycle methods.
 */
export interface IService {
  /**
   * Asynchronously initializes the service.
   * This can include loading configurations, connecting to external APIs,
   * or setting up initial state.
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  init(): Promise<void>

  /**
   * Stops the service and cleans up resources.
   * This includes clearing intervals, closing connections, etc.
   */
  stop(): void
}

/**
 * An extended interface for services that interact with the WebSocket.
 * These services manage a piece of the global state and can handle commands from clients.
 */
export interface IWebSocketService<TState, TCommand> extends IService {
  /**
   * Returns a snapshot of the service's current state.
   * @returns {TState} The current state object.
   */
  getState(): TState

  /**
   * Handles a command received from a WebSocket client.
   * @param {TCommand} command The command to be processed.
   * @param {any[]} args Additional arguments for the command.
   */
  handleCommand(command: TCommand, ...args: any[]): void
}

// --- Type Aliases for specific WebSocket services ---

export type ITimerService = IWebSocketService<TimerData, 'START' | 'PAUSE' | 'STOP'>
export type ISpotifyService = IWebSocketService<
  SpotifyData,
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE'
  | 'GET_DEVICES'
>

/**
 * A map to hold all registered WebSocket services.
 * The key is the service name, and the value is the service instance.
 */
export interface ServiceMap {
  tabataService: ITimerService
  spotifyService: ISpotifyService
  // Future services can be added here
}
