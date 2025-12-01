// File: types/service.ts
/**
 * @file Defines the core interfaces for services within the application.
 * This ensures a consistent contract for service initialization, command handling,
 * and lifecycle management (start/stop).
 */

import {
  SpotifyCommand,
  TimerCommand,
  TimerMode,
} from './websocket'

/**
 * Base interface for any service that has a lifecycle (start/stop).
 */
export interface IService {
  /**
   * Starts the service, including any periodic tasks (e.g., polling).
   * @returns {Promise<void> | void}
   */
  start(): Promise<void> | void

  /**
   * Stops the service and cleans up resources (e.g., intervals, connections).
   * @returns {Promise<void> | void}
   */
  stop(): Promise<void> | void
}

/**
 * Interface for services that interact with the WebSocket layer.
 * Extends IService with methods for handling commands and retrieving state.
 * @template TState The shape of the state object this service manages.
 * @template TCommand The type of commands this service can handle.
 */
export interface IWebSocketService<TState, TCommand> extends IService {
  /**
   * Retrieves the current state of the service.
   * @returns {TState} The current state snapshot.
   */
  getState(): TState

  /**
   * Handles a command received from a WebSocket client.
   * @param {TCommand} command The command to execute.
   * @param {any[]} args Additional arguments for the command.
   */
  handleCommand(command: TCommand, ...args: any[]): void
}

/**
 * A specialized WebSocket service for the Tabata Timer.
 */
export type ITimerService = IWebSocketService<TimerData, TimerCommand> & {
  setMode(mode: TimerMode): void
  setConfig(config: { workDuration: number; restDuration: number }): void
}

/**
 * A specialized WebSocket service for Spotify.
 */
export type ISpotifyService = IWebSocketService<SpotifyData, SpotifyCommand> & {
  isReady(): boolean
  getAvailableDevices(): Promise<any[]>
  setRefreshToken(token: string): void
  forcePollAndBroadcast(): void
}
