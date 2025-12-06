// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import HeartRateService from '@/services/HeartRateService.js'
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  HrmData,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  TimerCommandMessage,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'
import { getBaseURL } from './urls.js'

// Extend WebSocket to track client role
interface ExtWebSocket extends WebSocket {
  isAlive?: boolean
  clientType?: 'dashboard' | 'controller'
}

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
let heartRateServiceInstance: HeartRateService
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer

const hrmClients = new Map<string, HrmData>()

interface Services {
  tabataService: TabataTimer
  spotifyService: SpotifyPolling
  heartRateService: HeartRateService
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
  heartRateServiceInstance = services.heartRateService
  getUnifiedStateSnapshot = getSnapshot

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    const clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    extWs.isAlive = true
    console.log(`WebSocket Client connected: ${clientId}`)

    // Heartbeat
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    // Initialize with minimal placeholder; omit name so UI can suppress until real data arrives
    const defaultClientData: HrmData = {
      clientId,
      value: 0,
      maxHr: 185,
      // name intentionally undefined until first HRM_INPUT provides one
      age: 30,
    }
    hrmClients.set(clientId, defaultClientData)

    extWs.on('message', (message) => {
      handleIncomingMessage(extWs, message.toString(), clientId)
    })

    extWs.on('close', () => {
      console.log(`WebSocket Client disconnected: ${clientId}`)
      hrmClients.delete(clientId)
      broadcast({
        type: 'HRM_UPDATE',
        payload: Array.from(hrmClients.values()),
      })
    })
  })

  // Keep-alive pinger (runs every 30s)
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

/**
 * Handles incoming JSON messages from client applications.
 */
const handleIncomingMessage = (
  ws: ExtWebSocket,
  jsonMessage: string,
  clientId: string
) => {
  console.log(`[socketManager] INCOMING MESSAGE from ${clientId}:`, jsonMessage)
  try {
    // Parse and validate message type for type-safe routing
    const parsedMessage = JSON.parse(jsonMessage)
    console.log(`[socketManager] PARSED JSON:`, parsedMessage)

    const message = ClientCommandMessageSchema.parse(parsedMessage) // Use Zod for parsing and validation

    console.log(
      `[socketManager] Received message from ${clientId}:`,
      message.type
    )

    switch (message.type) {
      case 'REGISTER_CLIENT': {
        // Role Registration - Dashboard identifies itself as the executor
        ws.clientType = (message as ClientRegistrationMessage).role
        console.log(`[WS] Client registered as: ${ws.clientType}`)
        break
      }

      case 'GET_STATE': {
        // The client is requesting the full current state.
        const stateSnapshot = getUnifiedStateSnapshot()

        // Explicitly construct the payload to match the ServerMessage['payload'] type for 'INITIAL_STATE'
        const payload: InitialStateSnapshotPayload = {
          ...stateSnapshot,
          hrmData: Array.from(hrmClients.values()),
        }

        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        ws.send(JSON.stringify(initialStateMessage))
        break
      }

      case 'HRM_INPUT': {
        const existingClientData = hrmClients.get(clientId)
        if (existingClientData && message.data.value) {
          heartRateServiceInstance.addHeartRateDataPoint(message.data.value)
        }

        console.log(
          `[socketManager] HRM_INPUT - clientId: ${clientId}, existingData:`,
          existingClientData,
          'newValue:',
          message.data.value
        )
        if (existingClientData) {
          // Filter out null values to avoid overwriting valid data
          const updatedClientProperties = Object.fromEntries(
            Object.entries(message.data).filter(([_, value]) => value !== null)
          )
          hrmClients.set(clientId, {
            ...existingClientData,
            ...updatedClientProperties,
          })
          console.log(
            `[socketManager] HRM_INPUT - Updated clientData for ${clientId}:`,
            hrmClients.get(clientId)
          )
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(hrmClients.values()),
        })
        break
      }

      case 'TIMER_COMMAND': {
        const timerMessage = message as TimerCommandMessage
        if (tabataServiceInstance) {
          tabataServiceInstance.handleCommand(timerMessage.command)
        }
        if (timerMessage.command === 'START' && timerMessage.userSettings) {
          heartRateServiceInstance.startSession(timerMessage.userSettings)
        }
        if (timerMessage.command === 'STOP') {
          const workoutStats = heartRateServiceInstance.endSession()
          if (workoutStats) {
            fetch(`${getBaseURL()}/api/workouts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(workoutStats),
            })
          }
        }
        break
      }

      case 'SET_MODE': {
        if (tabataServiceInstance) {
          tabataServiceInstance.setMode(message.mode)
        }
        break
      }

      case 'TIMER_CONFIG': {
        if (tabataServiceInstance) {
          tabataServiceInstance.setConfig({
            workDuration: message.workDuration,
            restDuration: message.restDuration,
          })
        }
        break
      }

      case 'SPOTIFY_COMMAND': {
        const commandMsg = message as SpotifyCommandMessage
        console.log(`[WS Relay] Forwarding command: ${commandMsg.command}`)

        // Broadcast ONLY to connected Dashboards for remote execution
        wsServerInstance.clients.forEach((client: WebSocket) => {
          const target = client as ExtWebSocket
          // Only forward to the Dashboard, not other controllers
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

        // Also handle locally for backward compatibility
        if (spotifyServiceInstance) {
          spotifyServiceInstance.handleCommand(
            commandMsg.command,
            commandMsg.deviceId,
            commandMsg.volume,
            commandMsg.playlistUri
          )
        }
        break
      }

      default:
        // This case should ideally not be reached if ClientCommandMessageSchema is exhaustive
        console.warn(
          'Unknown message type received:',
          (message as { type: unknown }).type
        )
    }
  } catch (e) {
    console.error('Error processing incoming message:', e)
    // Add more specific error handling for Zod validation errors
    if (e instanceof z.ZodError) {
      console.error('WebSocket message validation failed:', e.issues)
    }
  }
}

export { initSocketManager }
