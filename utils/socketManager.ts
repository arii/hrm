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
  HrmData,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  DiagnosticAlert,
} from '../types/websocket.js'
import { broadcast, initBroadcaster } from './broadcast.js'

// Extend WebSocket to track client role
interface ExtWebSocket extends WebSocket {
  isAlive?: boolean
  clientType?: 'dashboard' | 'controller'
}

// Define service instances to be managed
let tabataServiceInstance: TabataTimer
let spotifyServiceInstance: SpotifyPolling
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer

const hrmClients = new Map<string, HrmData>()
const activeAlerts = new Map<string, DiagnosticAlert>()
const ALERT_DEBOUNCE_MS = 60000 // 60 seconds

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
      updateAlerts(clientId, [])
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
const processHrmInput = (clientId: string, data: HrmData) => {
  const alerts: DiagnosticAlert[] = []
  const deviceName = data.name || 'Device'

  // 1. BATTERY ALERT CHECK (Threshold: < 15%)
  if (data.batteryLevel !== undefined && data.batteryLevel <= 15) {
    alerts.push({
      clientId,
      code: 'LOW_BATTERY',
      message: `Warning: ${deviceName}'s battery is at ${data.batteryLevel}%. Please replace soon.`,
      severity: 'WARNING',
      timestamp: Date.now(),
    })
  }

  // 2. BAD PLACEMENT / STALE DATA CHECK
  const isStale = data.value === 0 || data.value === null
  const isPoorSignal =
    data.signalStatus === 'POOR' || data.signalStatus === 'DISCONNECTED'

  if (isStale && isPoorSignal) {
    alerts.push({
      clientId,
      code: 'BAD_PLACEMENT',
      message: `${deviceName} heart rate missing. Check device placement on the body.`,
      severity: 'ERROR',
      timestamp: Date.now(),
    })
  } else if (data.signalStatus === 'DISCONNECTED') {
    alerts.push({
      clientId,
      code: 'HRM_DISCONNECTED',
      message: `${deviceName} has disconnected from the client device. Reconnect needed.`,
      severity: 'ERROR',
      timestamp: Date.now(),
    })
  }

  // --- Update Global State ---
  updateAlerts(clientId, alerts)
}

const updateAlerts = (clientId: string, newAlerts: DiagnosticAlert[]) => {
  let hasChanged = false
  const now = Date.now()

  // Create a set of new alert codes for efficient lookup
  const newAlertCodes = new Set(newAlerts.map((a) => a.code))

  // Remove old alerts for this client if they are no longer active
  activeAlerts.forEach((alert, key) => {
    if (alert.clientId === clientId && !newAlertCodes.has(alert.code)) {
      activeAlerts.delete(key)
      hasChanged = true
    }
  })

  // Add or update new alerts
  newAlerts.forEach((alert) => {
    const alertKey = `${alert.clientId}:${alert.code}`
    const existingAlert = activeAlerts.get(alertKey)

    if (
      !existingAlert ||
      now - existingAlert.timestamp > ALERT_DEBOUNCE_MS
    ) {
      activeAlerts.set(alertKey, alert)
      hasChanged = true
    }
  })

  if (hasChanged) {
    broadcast({
      type: 'ALERTS_UPDATE',
      payload: Array.from(activeAlerts.values()),
    })
  }
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
          activeAlerts: Array.from(activeAlerts.values()),
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
          const updatedData = {
            ...existingClientData,
            ...updatedClientProperties,
          }
          hrmClients.set(clientId, updatedData)
          console.log(
            `[socketManager] HRM_INPUT - Updated clientData for ${clientId}:`,
            hrmClients.get(clientId)
          )
          processHrmInput(clientId, updatedData)
        }
        broadcast({
          type: 'HRM_UPDATE',
          payload: Array.from(hrmClients.values()),
        })
        break
      }

      case 'TIMER_COMMAND': {
        if (tabataServiceInstance) {
          tabataServiceInstance.handleCommand(message.command)
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
