// lib/commands/spotifyCommand.ts

import { WebSocket, Server as WebSocketServer } from 'ws';
import { CommandHandler } from './command';
import { ClientCommandMessage, SpotifyCommandMessage, SpotifyExecutionMessage, ExtWebSocket } from '../../types/websocket';
import { serviceContainer } from '../../lib/serviceContainer.js';
import { sendWebSocketMessage } from '../../utils/websocketUtils.js';
import logger from '../../utils/logger.js';

type SpotifyCommandDependencies = {
    wss: WebSocketServer;
};

export class SpotifyCommand implements CommandHandler {
    private wss: WebSocketServer;

    constructor({ wss }: SpotifyCommandDependencies) {
        this.wss = wss;
    }

    execute(ws: WebSocket, message: ClientCommandMessage): void {
        const extWs = ws as ExtWebSocket;
        const clientId = extWs.clientId;
        const commandMsg = message as SpotifyCommandMessage;

        logger.info(
            { clientId, command: commandMsg.command },
            'Forwarding Spotify command'
        );

        this.wss.clients.forEach((client: WebSocket) => {
            const target = client as ExtWebSocket;
            if (
                target.readyState === WebSocket.OPEN &&
                target.clientType === 'dashboard'
            ) {
                const executionMessage: SpotifyExecutionMessage = {
                    type: 'EXECUTE_SPOTIFY',
                    payload: commandMsg,
                };
                sendWebSocketMessage(
                    target,
                    executionMessage,
                    'socketManager.SPOTIFY_COMMAND'
                );
            }
        });

        serviceContainer
            .get('spotifyService')
            .handleCommand(
                commandMsg.command,
                commandMsg.deviceId,
                commandMsg.volume,
                commandMsg.playlistUri
            );
    }
}
