// File: lib/commands/RegisterClientCommand.ts
/**
 * Command to handle client registration and assign a role to the WebSocket session.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  ClientRegistrationMessage,
} from '../../types/websocket'
import logger from '../../utils/logger'

export class RegisterClientCommand implements ICommand {
  execute(
    ws: ExtWebSocket,
    message: ClientCommandMessage,
    clientId: string
  ): void {
    const registrationMessage = message as ClientRegistrationMessage
    ws.clientType = registrationMessage.role
    logger.info(
      { clientId, clientType: ws.clientType },
      'Client registered via command'
    )
  }
}
