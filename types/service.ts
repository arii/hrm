// types/service.ts

/**
 * Represents a basic service that can be initialized and stopped.
 */
export interface IService {
  /**
   * Initializes the service, performing any necessary asynchronous setup.
   * @returns A promise that resolves when the service is successfully initialized.
   */
  init(): Promise<void>;

  /**
   * Stops the service, cleaning up any resources.
   */
  stop(): void;

  /**
   * Checks if the service is ready and operational.
   * @returns True if the service is ready, false otherwise.
   */
  isReady(): boolean;
}

/**
 * Represents a service that can handle commands from a WebSocket connection.
 */
export interface IWebSocketService extends IService {
  /**
   * Handles a command received from a WebSocket client.
   * @param command The command to handle.
   * @param args Additional arguments for the command.
   */
  handleCommand(command: string, ...args: unknown[]): void;
}
