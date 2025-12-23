// lib/commands/command.ts

import { WebSocket } from 'ws';
import { ClientCommandMessage } from '../../types/websocket';

export interface CommandHandler {
    execute(ws: WebSocket, message: ClientCommandMessage): void;
}
