// File: utils/socketManager.ts (WebSocket Manager - Refactored to Command Pattern)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands via the
 * command pattern, and broadcasts state.
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
import { CommandRegistry } from '../lib/commands/CommandRegistry.js'
import { serviceContainer } from '../lib/serviceContainer.js'

// --- Import all command classes ---
import { PingCommand } from '../lib/commands/PingCommand.js'
import { RegisterClientCommand } from '../lib/commands/RegisterClientCommand.js'
import { GetStateCommand } from '../lib/commands/GetStateCommand.js'
import { HrmMetadataUpdateCommand } from '../lib/commands/HrmMetadataUpdateCommand.js'
import { HrmInputCommand } from '../lib/commands/HrmInputCommand.js'
import { TimerCommand } from '../lib/commands/TimerCommand.js'
import { SetModeCommand } from '../lib/commands/SetModeCommand.js'
import { TimerConfigCommand } from '../lib/commands/TimerConfigCommand.js'
import { SpotifyCommand } from '../lib/commands/SpotifyCommand.js'

// --- Module-level state ---
let wsServerInstance: WebSocketServer
const commandRegistry = new CommandRegistry()

// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

/**
 * Initializes the WebSocket Server manager, sets up the command registry,
 * and registers all command handlers.
 */
const initSocketManager = (
  wss: WebSocketServer,
  getSnapshot: () => StateSnapshot
) => {
  wsServerInstance = wss
  const hrmDataRepository: HrmDataRepository =
    serviceContainer.get('hrmDataRepository')

  // --- State Broadcaster Function ---
  const broadcastState = () => {
    broadcast(
      wsServerInstance,
      {
        type: 'HRM_UPDATE',
        payload: hrmDataRepository.findAll(),
      },
      'socketManager.broadcastState'
    )
  }

  // --- Register all commands with their dependencies ---
  commandRegistry.register('PING', new PingCommand())
  commandRegistry.register('REGISTER_CLIENT', new RegisterClientCommand())
  commandRegistry.register(
    'GET_STATE',
    new GetStateCommand(hrmDataRepository, getSnapshot)
  )
  commandRegistry.register(
    'HRM_METADATA_UPDATE',
    new HrmMetadataUpdateCommand(hrmDataRepository, broadcastState)
  )
  commandRegistry.register(
    'HRM_INPUT',
    new HrmInputCommand(hrmDataRepository, clientSessionState, broadcastState)
  )
  commandRegistry.register('TIMER_COMMAND', new TimerCommand())
  commandRegistry.register('SET_MODE', new SetModeCommand())
  commandRegistry.register('TIMER_CONFIG', new TimerConfigCommand())
  commandRegistry.register('SPOTIFY_COMMAND', new SpotifyCommand(wss))

  // --- Connection Handling ---
  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    extWs.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.lastPingTime = Date.now()
    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    // Initialize new client state
    const newClient: HrmStreamData = {
      clientId: extWs.clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      calories: 0,
    }
    hrmDataRepository.save(newClient)
    clientSessionState.set(extWs.clientId, {
      lastUpdate: Date.now(),
      accumulatedCalories: 0,
    })

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      hrmDataRepository.deleteById(extWs.clientId)
      clientSessionState.delete(extWs.clientId)
      broadcastState()
    })
  })

  // --- Server-side Watchdog for Stale Connections ---
  const WATCHDOG_INTERVAL = 30000 // 30 seconds
  const CLIENT_INACTIVITY_TIMEOUT = 120000 // 2 minutes

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
 * Parses, validates, and dispatches incoming messages using the command registry.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    const command = commandRegistry.get(message)
    if (command) {
      command.execute(ws, message, clientId)
    } else {
      logger.warn(
        { clientId, type: message.type },
        'Unknown message type received'
      )
    }
  } catch (e) {
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
 * Resets the socket manager state. Use this for testing purposes only.
 */
export const resetSocketManager = () => {
  const hrmDataRepository: HrmDataRepository =
    serviceContainer.get('hrmDataRepository')
  hrmDataRepository.clear()
  clientSessionState.clear()
  // Note: Command registry is not cleared as it's typically configured once.
}

export { initSocketManager }
