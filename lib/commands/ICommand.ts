// File: lib/commands/ICommand.ts
/**
 * Interface for the Command Pattern. All concrete command classes must implement this interface.
 */
import { ExtWebSocket } from '../../types/websocket'
import { ClientCommandMessage } from '../../types/websocket'

export interface ICommand {
  execute(
    ws: ExtWebSocket,
    message: ClientCommandMessage,
    clientId: string
  ): void
}
