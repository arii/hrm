// lib/commands/pingCommand.ts

import { WebSocket } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, ExtWebSocket } from '../../types/websocket';
import { sendWebSocketMessage } from '../../utils/websocketUtils.js';

export class PingCommand implements CommandHandler {
    execute(ws: WebSocket, _message: ClientCommandMessage): void {
        const extWs = ws as ExtWebSocket;
        extWs.lastPingTime = Date.now();
        sendWebSocketMessage(ws, { type: 'PONG' }, 'socketManager.PING');
    }
}
