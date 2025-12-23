// File: lib/commands/SpotifyCommand.ts
/**
 * Command to handle Spotify control actions, forwarding them to the dashboard
 * and executing them on the server-side Spotify service.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
} from '../../types/websocket'
import { serviceContainer } from '../serviceContainer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { sendWebSocketMessage } from '../../utils/websocketUtils'
import { WebSocket, Server as WebSocketServer } from 'ws'
import logger from '../../utils/logger'

export class SpotifyCommand implements ICommand {
  private spotifyService: SpotifyPolling
  private wsServerInstance: WebSocketServer

  constructor(wsServerInstance: WebSocketServer) {
    this.spotifyService = serviceContainer.get('spotifyService')
    this.wsServerInstance = wsServerInstance
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    clientId: string
  ): void {
    const commandMsg = message as SpotifyCommandMessage
    logger.info(
      { clientId, command: commandMsg.command },
      'Forwarding Spotify command via command pattern'
    )

    this.wsServerInstance.clients.forEach((client: WebSocket) => {
      const target = client as ExtWebSocket
      if (
        target.readyState === WebSocket.OPEN &&
        target.clientType === 'dashboard'
      ) {
        const executionMessage: SpotifyExecutionMessage = {
          type: 'EXECUTE_SPOTIFY',
          payload: commandMsg,
        }
        sendWebSocketMessage(
          target,
          executionMessage,
          'socketManager.SPOTIFY_COMMAND'
        )
      }
    })

    this.spotifyService.handleCommand(
      commandMsg.command,
      commandMsg.deviceId,
      commandMsg.volume,
      commandMsg.playlistUri
    )
  }
}
