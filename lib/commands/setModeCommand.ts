// lib/commands/setModeCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, SetModeMessage } from '../../types/websocket';
import { serviceContainer } from '../../lib/serviceContainer';

export class SetModeCommand implements CommandHandler {
    execute(_ws: WebSocket, message: ClientCommandMessage): void {
        const setModeMessage = message as SetModeMessage;
        serviceContainer.get('tabataService').setMode(setModeMessage.mode);
    }
}
