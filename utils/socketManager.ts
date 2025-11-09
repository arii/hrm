// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws';
import { 
    UnifiedStateMessage, ClientCommandMessage 
} from '../types/websocket'; 
import { default as SpotifyPolling } from '../services/spotifyPolling';
import { default as TabataTimer } from '../services/tabataTimer';

// Define service instances to be managed
let wssInstance: WebSocketServer;
let tabataServiceInstance: TabataTimer;
let spotifyServiceInstance: SpotifyPolling;

interface Services {
    tabataService: TabataTimer;
    spotifyService: SpotifyPolling;
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
export const initSocketManager = (wss: WebSocketServer, services: Services) => {
    wssInstance = wss;
    tabataServiceInstance = services.tabataService;
    spotifyServiceInstance = services.spotifyService;

    wssInstance.on('connection', (ws: WebSocket) => { // Type the client ws
        console.log('WebSocket Client connected.');
        
        // Send initial state upon connection
        // State is retrieved using typed methods from services
        ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            hrmData: { value: 0, maxHr: 185 },
            timerData: tabataServiceInstance.getState(),
            spotifyData: spotifyServiceInstance.getState(),
        } as UnifiedStateMessage));

        ws.on('message', (message) => {
            handleIncomingMessage(ws, message.toString());
        });

        ws.on('close', () => {
            console.log('WebSocket Client disconnected.');
        });
    });
};

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (ws: WebSocket, messageString: string) => {
    try {
        // Parse and assert message type for type-safe routing
        const message: ClientCommandMessage = JSON.parse(messageString) as ClientCommandMessage;
        
        switch (message.type) {
            case 'HRM_INPUT':
                // Check if message structure matches the interface before processing
                if (message.data && typeof message.data.value === 'number') {
                    spotifyServiceInstance.processHeartRate(message.data.value);
                }
                break;

            case 'TIMER_COMMAND':
                if (tabataServiceInstance) {
                    // Command is guaranteed to be typed as START|PAUSE|STOP
                    tabataServiceInstance.handleCommand(message.command);
                }
                break;

            case 'SPOTIFY_COMMAND':
                if (spotifyServiceInstance) {
                    spotifyServiceInstance.handleCommand(message.command);
                }
                break;

            default:
                console.warn('Unknown message type received:', (message as any).type);
        }
    } catch (e) {
        console.error('Error processing incoming message:', e);
    }
};

module.exports = { initSocketManager };