// File: utils/socketManager.ts (WebSocket Manager - Refactored with Command Pattern)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import {
  ClientCommandMessageSchema,
  StateSnapshot,
  ExtWebSocket,
} from '../types/websocket.js'
import { HrmStreamData } from '../types/core.js'
import { broadcast } from './websocketUtils.js'
import logger from './logger.js'

// Command Pattern Imports
import { CommandRegistry } from '../lib/commands/commandRegistry.js'
import { PingCommand } from '../lib/commands/pingCommand.js'
import { RegisterClientCommand } from '../lib/commands/registerClientCommand.js'
import { GetStateCommand } from '../lib/commands/getStateCommand.js'
import { HrmMetadataUpdateCommand } from '../lib/commands/hrmMetadataUpdateCommand.js'
import { HrmInputCommand } from '../lib/commands/hrmInputCommand.js'
import { TimerCommand } from '../lib/commands/timerCommand.js'
import { SetModeCommand } from '../lib/commands/setModeCommand.js'
import { TimerConfigCommand } from '../lib/commands/timerConfigCommand.js'
import { SpotifyCommand } from '../lib/commands/spotifyCommand.js'

// State and Dependencies
let getUnifiedStateSnapshot: () => StateSnapshot
let wsServerInstance: WebSocketServer
const clientData = new Map<string, HrmStreamData>()
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()
const commandRegistry = new CommandRegistry()

/**
 * Broadcasts the current HRM state to all connected clients.
 */
const broadcastState = () => {
  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: Array.from(clientData.values()),
    },
    'socketManager.broadcastState'
  )
}

/**
 * Initializes the WebSocket Server manager and registers command handlers.
 */
const initSocketManager = (
  wss: WebSocketServer,
  getSnapshot: () => StateSnapshot
) => {
  wsServerInstance = wss
  getUnifiedStateSnapshot = getSnapshot

  // Register all command handlers
  commandRegistry.register('PING', new PingCommand())
  commandRegistry.register('REGISTER_CLIENT', new RegisterClientCommand())
  commandRegistry.register(
    'GET_STATE',
    new GetStateCommand({ getUnifiedStateSnapshot, clientData })
  )
  commandRegistry.register(
    'HRM_METADATA_UPDATE',
    new HrmMetadataUpdateCommand({ clientData, broadcastState })
  )
  commandRegistry.register(
    'HRM_INPUT',
    new HrmInputCommand({ clientData, clientSessionState, broadcastState })
  )
  commandRegistry.register('TIMER_COMMAND', new TimerCommand())
  commandRegistry.register('SET_MODE', new SetModeCommand())
  commandRegistry.register('TIMER_CONFIG', new TimerConfigCommand())
  commandRegistry.register('SPOTIFY_COMMAND', new SpotifyCommand({ wss }))

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    extWs.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.lastPingTime = Date.now()
    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    // Initialize new client state
    clientData.set(extWs.clientId, {
      clientId: extWs.clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      calories: 0,
    })
    clientSessionState.set(extWs.clientId, {
      lastUpdate: Date.now(),
      accumulatedCalories: 0,
    })

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString())
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      clientData.delete(extWs.clientId)
      clientSessionState.delete(extWs.clientId)
      broadcastState()
    })
  })

  // Server-side watchdog for stale connections
  const WATCHDOG_INTERVAL = 30000
  const CLIENT_INACTIVITY_TIMEOUT = 120000
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket
      if (Date.now() - extWs.lastPingTime > CLIENT_INACTIVITY_TIMEOUT) {
        logger.warn(
          { clientId: extWs.clientId },
          'Terminating stale WebSocket connection'
        )
        ws.terminate()
      }
    })
  }, WATCHDOG_INTERVAL)

  wss.on('close', () => {
    clearInterval(interval)
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (ws: ExtWebSocket, messageString: string) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)
    commandRegistry.execute(ws, message)
  } catch (e) {
    const clientId = ws.clientId
    if (e instanceof z.ZodError) {
      logger.error(
        { clientId, errors: e.issues },
        'WebSocket message validation failed'
      )
    } else {
      logger.error({ clientId, error: e }, 'Error processing incoming message')
    }
  }
}

/**
 * Resets the socket manager state. For testing purposes only.
 */
export const resetSocketManager = () => {
  clientData.clear()
  clientSessionState.clear()
}

export { initSocketManager }
