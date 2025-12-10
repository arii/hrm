// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  HrmMetric,
  InitialStateSnapshotPayload,
  ServerMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  StateSnapshot,
  UnifiedStateMessage,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'

// --- Module-level state ---

let wsServerInstance: WebSocketServer
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
let getUnifiedStateSnapshot: () => StateSnapshot

interface InternalHrmClient {
  clientId: string
  value: number
  maxHr: number
  name?: string
  age?: number
  connected: boolean
}

const hrmClients = new Map<string, InternalHrmClient>()

// Extend WebSocket to track client role
interface ExtWebSocket extends WebSocket {
  isAlive?: boolean
  clientType?: 'dashboard' | 'controller'
}

/**
 * [NEW] Broadcasts the single, unified state to all connected clients.
 * This is now the primary method for sending real-time updates.
 */
export const broadcastUnifiedState = () => {
  const stateSnapshot = getUnifiedStateSnapshot()
  if (!stateSnapshot) {
    console.error(
      '[socketManager] broadcastUnifiedState failed: stateSnapshot is null/undefined.'
    )
    return
  }

  const { timerData, spotifyData } = stateSnapshot

  const hrmMetrics: HrmMetric[] = Array.from(hrmClients.values()).map(
    (client) => {
      const percentMax =
        client.maxHr > 0 ? (client.value / client.maxHr) * 100 : 0
      return {
        clientId: client.clientId,
        value: client.value,
        percentMax: Math.round(percentMax),
        connected: client.connected,
      }
    }
  )

  const message: UnifiedStateMessage = {
    type: 'STATE_UPDATE',
    hrmMetrics,
    timerData: {
      currentPhase: timerData.currentPhase,
      timeRemaining: timerData.timeRemaining,
      timeElapsed: timerData.timeElapsed,
    },
    // spotifyData is passed through as-is
    spotifyData,
  }

  // The generic `broadcast` function handles the actual sending
  console.log(
    '[socketManager] Broadcasting unified state:',
    JSON.stringify(message, null, 2)
  )
  broadcast(message)
}

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  services: {
    tabataService: TabataTimer
    spotifyService: SpotifyPolling
  },
  getSnapshot: () => StateSnapshot
) => {
  initBroadcaster(wss)
  wsServerInstance = wss
  tabataServiceInstance = services.tabataService
  spotifyServiceInstance = services.spotifyService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.isAlive = true
    console.log(`WebSocket Client connected: ${clientId}`)

    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    const defaultClientData: InternalHrmClient = {
      clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      connected: true,
      // name is intentionally undefined; will be seeded from server session in next phase
    }
    hrmClients.set(clientId, defaultClientData)

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      hrmClients.delete(clientId)
      broadcastUnifiedState()
    })

    // On connection, immediately send the current state to the new client
    // and broadcast to others that a new client has joined.
    broadcastUnifiedState()
  })

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket
      if (extWs.isAlive === false) return ws.terminate()
      extWs.isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on('close', () => clearInterval(interval))
}

const handleIncomingMessage = (
  ws: ExtWebSocket,
  jsonMessage: string,
  clientId: string
) => {
  try {
    const parsedMessage = JSON.parse(jsonMessage)
    const message = ClientCommandMessageSchema.parse(parsedMessage)

    console.log(
      `[socketManager] Received message from ${clientId}:`,
      message.type
    )

    switch (message.type) {
      case 'REGISTER_CLIENT': {
        ws.clientType = (message as ClientRegistrationMessage).role
        console.log(`[WS] Client registered as: ${ws.clientType}`)
        break
      }
      case 'GET_STATE': {
        const stateSnapshot = getUnifiedStateSnapshot()
        const hrmMetrics: HrmMetric[] = Array.from(hrmClients.values()).map(
          (client) => ({
            clientId: client.clientId,
            value: client.value,
            percentMax:
              client.maxHr > 0
                ? Math.round((client.value / client.maxHr) * 100)
                : 0,
            connected: client.connected,
          })
        )
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmMetrics: hrmMetrics,
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        ws.send(JSON.stringify(initialStateMessage))
        break
      }
      case 'HRM_INPUT': {
        const clientData = hrmClients.get(clientId)
        if (clientData && message.data.value !== null) {
          clientData.value = message.data.value
          hrmClients.set(clientId, clientData)
        }
        broadcastUnifiedState()
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
      default:
        console.warn(
          'Unknown message type received:',
          (message as { type: unknown }).type
        )
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('WebSocket message validation failed:', e.issues)
    } else {
      console.error('Error processing incoming message:', e)
    }
  }
}

export { initSocketManager }
