// lib/commands/setModeCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, TimerModeCommandMessage } from '../../types/websocket';
import { serviceContainer } from '../../lib/serviceContainer.js';

export class SetModeCommand implements CommandHandler {
    execute(_ws: WebSocket, message: ClientCommandMessage): void {
        const timerModeMessage = message as TimerModeCommandMessage;
        serviceContainer.get('tabataService').setMode(timerModeMessage.mode);
    }
}
