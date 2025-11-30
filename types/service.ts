// File: types/service.ts
/**
 * Defines the common interfaces that all backend services must implement.
 * This ensures consistency and allows for a standardized service lifecycle management.
 */

/**
 * The base interface for any persistent service.
 */
export interface IService {
  /**
   * Performs cleanup operations, such as clearing intervals or closing connections,
   * to ensure a graceful shutdown of the service.
   */
  cleanup(): void;
}

/**
 * An interface for services that can be controlled via WebSocket commands.
 * Extends the base IService interface.
 */
export interface IWebSocketService extends IService {
  /**
   * Processes a command received from a client via the WebSocket manager.
   * @param command - The command object to be processed. The structure of this
   *                  object will vary depending on the service.
   */
  handleCommand(command: unknown): void;
}

/**
 * An interface for services that maintain a state that can be queried.
 * @template T - The type of the state object that the service manages.
 */
export interface IStatefulService<T> {
  /**
   * Retrieves the current state of the service.
   * @returns The current state object of type T.
   */
  getState(): T;
}
