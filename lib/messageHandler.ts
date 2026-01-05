// File: lib/messageHandler.ts
import { z } from 'zod';
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  ExtWebSocket,
} from '../types/websocket';
import { AppServices } from './services';
import logger from '../utils/logger';
import { sendWebSocketMessage } from '../utils/websocketUtils';
import { WebSocket, WebSocketServer } from 'ws';

export function handleIncomingMessage(
  ws: ExtWebSocket,
  messageString: string,
  clientId: string,
  services: AppServices,
  getUnifiedStateSnapshot: () => StateSnapshot,
  wsServerInstance: WebSocketServer,
  broadcastState: () => void
) {
  try {
    const parsedJson = JSON.parse(messageString);
    const message = ClientCommandMessageSchema.parse(parsedJson);

    switch (message.type) {
      case 'PING': {
        logger.info({ clientId }, 'Received PING, sending PONG.');
        const pongMessage: ServerMessage = { type: 'PONG' };
        sendWebSocketMessage(ws, pongMessage, 'messageHandler.PING');
        break;
      }
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role;
        logger.info(
          { clientId, clientType: ws.clientType },
          'Client registered'
        );
        break;
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot();
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: services.hrmService.getHrmData(),
        };
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        };
        sendWebSocketMessage(ws, initialStateMessage, 'messageHandler.GET_STATE');
        break;
      }
      case 'HRM_METADATA_UPDATE': {
        services.hrmService.updateMetadata(clientId, message.data);
        broadcastState();
        break;
      }
      case 'HRM_INPUT': {
        services.hrmService.processHrmInput(clientId, message.data);
        broadcastState();
        break;
      }
      case 'TIMER_COMMAND':
        services.tabataService.handleCommand(message.command);
        break;
      case 'SET_MODE':
        services.tabataService.setMode(message.mode);
        break;
      case 'TIMER_CONFIG':
        services.tabataService.setConfig({
          workDuration: message.workDuration,
          restDuration: message.restDuration,
        });
        break;
      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage;
        logger.info(
          { clientId, command: commandMsg.command },
          'Forwarding Spotify command'
        );

        wsServerInstance.clients.forEach((client: WebSocket) => {
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
              'messageHandler.SPOTIFY_COMMAND'
            );
          }
        });

        const spotifyService = services.spotifyService;
        const spotifyCommandParams: {
          deviceId?: string;
          volume?: number;
          playlistUri?: string;
          contextUri?: string;
          uri?: string;
        } = {};
        if (commandMsg.deviceId)
          spotifyCommandParams.deviceId = commandMsg.deviceId;
        if (commandMsg.volume !== undefined)
          spotifyCommandParams.volume = commandMsg.volume;
        if (commandMsg.playlistUri)
          spotifyCommandParams.playlistUri = commandMsg.playlistUri;
        if (commandMsg.contextUri)
          spotifyCommandParams.contextUri = commandMsg.contextUri;
        if (commandMsg.uri) spotifyCommandParams.uri = commandMsg.uri;

        spotifyService.handleCommand(commandMsg.command, spotifyCommandParams);
        break;
      }
      default: {
        const unknownMessage = message as { type: unknown };
        logger.warn(
          { clientId, type: unknownMessage.type },
          'Unknown message type received'
        );
        break;
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      logger.error(
        { clientId, errors: e.issues },
        'WebSocket message validation failed'
      );
    } else {
      logger.error({ clientId, error: e }, 'Error processing incoming message');
    }
  }
}
