// lib/commands/timerConfigCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, TimerConfigMessage } from '../../types/websocket';
import { serviceContainer } from '../../lib/serviceContainer.js';

export class TimerConfigCommand implements CommandHandler {
    execute(_ws: WebSocket, message: ClientCommandMessage): void {
        const timerConfigMessage = message as TimerConfigMessage;
        serviceContainer.get('tabataService').setConfig({
            workDuration: timerConfigMessage.workDuration,
            restDuration: timerConfigMessage.restDuration,
        });
    }
}
