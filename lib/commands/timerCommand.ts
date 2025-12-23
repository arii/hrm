// lib/commands/timerCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, TimerCommandMessage } from '../../types/websocket';
import { serviceContainer } from '../../lib/serviceContainer';

export class TimerCommand implements CommandHandler {
    execute(_ws: WebSocket, message: ClientCommandMessage): void {
        const timerMessage = message as TimerCommandMessage;
        serviceContainer.get('tabataService').handleCommand(timerMessage.command);
    }
}
