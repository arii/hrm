// File: websocketServer.ts (Dedicated WebSocket Server)
/**
 * Description: Initializes and manages the WebSocket server on a dedicated port.
 */

import { createServer, IncomingMessage } from 'http';
import { Socket } from 'net';
import { parse } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import logger from './utils/logger.js';

const wsPort: number = process.env.WS_PORT ? +process.env.WS_PORT : 3001;
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

export function startWebSocketServer(wss: WebSocketServer) {
    const server = createServer();

    const wsConnections = new Map<string, number>();
    const WS_MAX_CONNECTIONS = 5;

    server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = parse(req.url || '');
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() || req.socket.remoteAddress;

        if (process.env.TESTING !== 'true' && ip) {
            const count = wsConnections.get(ip) || 0;
            if (count >= WS_MAX_CONNECTIONS) {
                socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                socket.destroy();
                return;
            }
            wsConnections.set(ip, count + 1);

            socket.on('close', () => {
                const currentCount = wsConnections.get(ip) || 0;
                if (currentCount > 0) {
                    wsConnections.set(ip, currentCount - 1);
                }
            });
        }

        if (pathname === '/ws') {
            wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
                wss.emit('connection', ws, req);
            });
        } else {
            socket.destroy();
        }
    });

    server.on('error', (err: Error) => {
        logger.error({ err }, 'WebSocket server error');
        process.exit(1);
    });

    server.listen(wsPort, hostname, () => {
        logger.info(`> WebSocket Server listening on ws://${hostname}:${wsPort}/ws`);
    });

    return server;
}
