// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  HrmDevice,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  HrmMetric,
} from '../types/websocket.js'
import { CALORIE_DEFAULTS } from './constants.js' // Ensure this import exists
import { broadcast, initBroadcaster } from './broadcast.js'
import logger from './logger.js'

// Extend WebSocket to track client role and connection health
interface ExtWebSocket extends WebSocket {
  lastPingTime: number // Changed to non-optional
  clientType?: 'dashboard' | 'controller'
  clientId: string
}

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer

const clientData = new Map<string, HrmDevice>()
// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<string, { lastUpdate: number }>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  services: Services,
  getSnapshot: () => StateSnapshot
) => {
  initBroadcaster(wss)
  wsServerInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    extWs.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.lastPingTime = Date.now() // Initialize on connect
    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    // Initialize new client
    const newClient: HrmDevice = {
      clientId: extWs.clientId,
      maxHr: 185,
      age: 30,
      calories: 0,
    }
    clientData.set(extWs.clientId, newClient)
    clientSessionState.set(extWs.clientId, { lastUpdate: Date.now() })
    broadcastDeviceList()

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), extWs.clientId)
    })

    extWs.on('close', () => {
      logger.info({ clientId: extWs.clientId }, 'WebSocket client disconnected')
      clientData.delete(extWs.clientId)
      clientSessionState.delete(extWs.clientId)
      broadcastDeviceList()
    })
  })

  // Server-side watchdog to clean up stale connections.
  const WATCHDOG_INTERVAL = 30000 // 30 seconds
  const CLIENT_INACTIVITY_TIMEOUT = 120000 // 2 minutes

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket

      // If the client hasn't responded in time, terminate.
      if (now - extWs.lastPingTime > CLIENT_INACTIVITY_TIMEOUT) {
        logger.warn(
          { clientId: extWs.clientId },
          'Terminating stale WebSocket connection (no pong received)'
        )
        return ws.terminate()
      }
    })
  }, WATCHDOG_INTERVAL)

  wss.on('close', () => clearInterval(interval))
}

const broadcastHrmUpdate = (metrics: HrmMetric[]) => {
  if (metrics.length > 0) {
    broadcast({
      type: 'HRM_UPDATE',
      payload: metrics,
    })
  }
}

const broadcastDeviceList = () => {
  const devices = Array.from(clientData.values())
  broadcast({
    type: 'HRM_DEVICE_UPDATE',
    payload: devices,
  })
}

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  messageString: string,
  clientId: string
) => {
  try {
    const parsedJson = JSON.parse(messageString)
    const message = ClientCommandMessageSchema.parse(parsedJson)

    switch (message.type) {
      case 'PING': {
        ws.lastPingTime = Date.now()
        ws.send(JSON.stringify({ type: 'PONG' }))
        break
      }
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role
        logger.info(
          { clientId, clientType: ws.clientType },
          'Client registered'
        )
        break
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot()
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(clientData.values()),
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        ws.send(JSON.stringify(initialStateMessage))
        break
      }
      case 'HRM_INPUT': {
        const existingData = clientData.get(clientId)
        const sessionState = clientSessionState.get(clientId)

        if (existingData && sessionState) {
          const now = Date.now()
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
          sessionState.lastUpdate = now

          let newCalories = existingData.calories
          const currentHr = message.data.value
          const currentAge = message.data.age ?? existingData.age ?? 30

          if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
            const rate =
              (-CALORIE_DEFAULTS.INTERCEPT +
                CALORIE_DEFAULTS.FACTOR_HR * currentHr +
                CALORIE_DEFAULTS.FACTOR_WEIGHT * CALORIE_DEFAULTS.WEIGHT_KG +
                CALORIE_DEFAULTS.FACTOR_AGE * currentAge) /
              CALORIE_DEFAULTS.JOULE_CONVERSION

            const safeRate = Math.max(0, rate)
            newCalories += safeRate * dtMinutes
          }

          const updateData: Partial<HrmDevice> = Object.fromEntries(
            Object.entries(message.data).filter(
              ([_, value]) => value !== null && value !== undefined
            )
          )

          clientData.set(clientId, {
            ...existingData,
            ...updateData,
            calories: Math.round(newCalories * 10) / 10,
          })

          const newMetric: HrmMetric = {
            clientId,
            value: currentHr,
            timestamp: now,
          }
          broadcastHrmUpdate([newMetric])
        }
        break
      }

      case 'TIMER_COMMAND':
        tabataServiceInstance?.handleCommand(message.command)
        break

      case 'SET_MODE':
        tabataServiceInstance?.setMode(message.mode)
        break

      case 'TIMER_CONFIG':
        tabataServiceInstance?.setConfig({
          workDuration: message.workDuration,
          restDuration: message.restDuration,
        })
        break

      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage
        logger.info(
          { clientId, command: commandMsg.command },
          'Forwarding Spotify command'
        )

        wsServerInstance.clients.forEach((client: WebSocket) => {
          const target = client as ExtWebSocket
          if (
            target.readyState === WebSocket.OPEN &&
            target.clientType === 'dashboard'
          ) {
            const executionMessage: SpotifyExecutionMessage = {
              type: 'EXECUTE_SPOTIFY',
              payload: commandMsg,
            }
            target.send(JSON.stringify(executionMessage))
          }
        })

        spotifyServiceInstance?.handleCommand(
          commandMsg.command,
          commandMsg.deviceId,
          commandMsg.volume,
          commandMsg.playlistUri
        )
        break
      }
      default: {
        const unknownMessage = message as { type: unknown }
        logger.warn(
          { clientId, type: unknownMessage.type },
          'Unknown message type received'
        )
        break
      }
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

export { initSocketManager }
