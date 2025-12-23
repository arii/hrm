// lib/commands/commandRegistry.ts

import { WebSocket } from 'ws';
import { ClientCommandMessage } from '../../types/websocket';
import { CommandHandler } from './command';
import logger from '../../utils/logger';

export class CommandRegistry {
    private commands = new Map<string, CommandHandler>();

    register(commandType: string, handler: CommandHandler): void {
        this.commands.set(commandType, handler);
    }

    execute(ws: WebSocket, message: ClientCommandMessage): void {
        const handler = this.commands.get(message.type);
        if (handler) {
            handler.execute(ws, message);
        } else {
            logger.warn({ type: message.type }, 'No handler registered for this command type');
        }
    }
}
