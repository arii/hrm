// lib/commands/registerClientCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, ClientRegistrationMessage, ExtWebSocket } from '../../types/websocket';
import logger from '../../utils/logger';

export class RegisterClientCommand implements CommandHandler {
    execute(ws: WebSocket, message: ClientCommandMessage): void {
        const extWs = ws as ExtWebSocket;
        const registrationMessage = message as ClientRegistrationMessage;
        extWs.clientType = registrationMessage.role;
        logger.info(
            { clientId: extWs.clientId, clientType: extWs.clientType },
            'Client registered'
        );
    }
}
