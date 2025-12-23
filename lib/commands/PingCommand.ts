// File: lib/commands/PingCommand.ts
/**
 * Command to handle client PING messages, used for keep-alive.
 */
import { ICommand } from './ICommand'
import { ExtWebSocket, ClientCommandMessage } from '../../types/websocket'
import { sendWebSocketMessage } from '../../utils/websocketUtils'

export class PingCommand implements ICommand {
  execute(
    ws: ExtWebSocket,
    _message: ClientCommandMessage, // The message content is not needed for PING
    _clientId: string
  ): void {
    ws.lastPingTime = Date.now()
    sendWebSocketMessage(ws, { type: 'PONG' }, 'socketManager.PING')
  }
}
