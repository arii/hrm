// File: utils/socketManager.ts (WebSocket Manager - Typed)
/**
 * WebSocket Manager (Typed): Handles client connections, routes commands, and broadcasts state.
 */
import { WebSocket, Server as WebSocketServer } from 'ws'
import { z } from 'zod' // Import z from zod
import {
  ClientCommandMessageSchema,
  ClientRegistrationMessage,
  SpotifyCommandMessage,
  SpotifyExecutionMessage,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
  ExtWebSocket,
} from '../types/websocket.js'
import { HrmStreamData } from '../types/core.js'
import { CALORIE_DEFAULTS } from './constants.js' // Ensure this import exists
import {
  broadcast,
  sendWebSocketMessage,
  ConnectionMonitor,
} from './websocketUtils.js'
import logger from './logger.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { AppServices } from '../lib/services.js'

// Define service instances to be managed
// New: Define a function to get the state snapshot
let getUnifiedStateSnapshot: () => StateSnapshot
// Store WebSocket server reference for command relay
let wsServerInstance: WebSocketServer
let connectionMonitor: ConnectionMonitor
let services: AppServices

const hrmDataRepository = new HrmDataRepository()

// New: Maps to track the relationship between physical deviceId and ephemeral clientId
const deviceIdToClientIdMap = new Map<string, string>()
const clientIdToDeviceIdMap = new Map<string, string>()

// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>()

/**
 * Initializes the WebSocket Server manager and registers the core services.
 */
const initSocketManager = (
  wss: WebSocketServer,
  getSnapshot: () => StateSnapshot,
  svcs: AppServices
) => {
  wsServerInstance = wss
  getUnifiedStateSnapshot = getSnapshot
  services = svcs
  connectionMonitor = new ConnectionMonitor(wss)
  connectionMonitor.start()

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtWebSocket
    extWs.isAlive = true
    extWs.on('pong', () => {
      extWs.isAlive = true
    })

    extWs.clientId = `user-${Math.random().toString(36).substring(2, 9)}`
    logger.info({ clientId: extWs.clientId }, 'WebSocket client connected')

    // Initialize new client
    const newClient: HrmStreamData = {
      clientId: extWs.clientId,
      value: 0,
      maxHr: 185,
      age: 30,
      calories: 0, // Initialize to 0
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
      const deviceId = clientIdToDeviceIdMap.get(extWs.clientId)
      if (deviceId) {
        deviceIdToClientIdMap.delete(deviceId)
        clientIdToDeviceIdMap.delete(extWs.clientId)
        // Note: We keep the HRM data in the repository so it can be reclaimed
        // upon reconnection. Consider a TTL/cleanup mechanism for abandoned data.
        logger.info(
          { clientId: extWs.clientId, deviceId },
          'Client disconnected, but preserving HRM data for potential reconnect'
        )
      } else {
        // If there's no associated deviceId, it's safe to clean up the data.
        hrmDataRepository.deleteById(extWs.clientId)
      }
      clientSessionState.delete(extWs.clientId)
      broadcastState()
    })
  })

  wss.on('close', () => {
    connectionMonitor.stop()
  })
}

/**
 * Resets the socket manager state. Use this for testing purposes only.
 */
export const resetSocketManager = () => {
  hrmDataRepository.clear()
  clientSessionState.clear()
}

const broadcastState = () => {
  const allHrmData = hrmDataRepository.findAll()
  const activeClientIds = new Set(
    Array.from(wsServerInstance.clients).map((ws) => (ws as ExtWebSocket).clientId)
  )

  const hrmDataWithStatus = allHrmData.map((data) => ({
    ...data,
    isConnected: activeClientIds.has(data.clientId),
  }))

  broadcast(
    wsServerInstance,
    {
      type: 'HRM_UPDATE',
      payload: hrmDataWithStatus,
    },
    'socketManager.broadcastState'
  )
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
        // This is now a no-op. The server relies on native WebSocket ping/pong
        // frames for heartbeat. The case is retained for backward
        // compatibility with older clients that might still send this message.
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
          hrmData: hrmDataRepository.findAll(),
        }
        const initialStateMessage: ServerMessage = {
          type: 'INITIAL_STATE',
          payload: payload,
        }
        sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
        break
      }
      case 'HRM_METADATA_UPDATE': {
        const { deviceId, ...metadata } = message.data

        if (deviceId) {
          const existingClientId = deviceIdToClientIdMap.get(deviceId)
          if (existingClientId && existingClientId !== clientId) {
            // This device was previously connected under a different clientId.
            // This is a reconnection.
            logger.info(
              { deviceId, oldClientId: existingClientId, newClientId: clientId },
              'Device reconnected with a new session. Migrating state.'
            )

            // 1. Retrieve the old data.
            const oldData = hrmDataRepository.findById(existingClientId)
            if (oldData) {
              // 2. Delete the old entry.
              hrmDataRepository.deleteById(existingClientId)

              // 3. Create a new entry with the new clientId but the old data.
              const migratedData: HrmStreamData = {
                ...oldData,
                clientId: clientId, // Assign the new clientId
                ...metadata, // Apply any new metadata
              }
              hrmDataRepository.save(migratedData)
            }

            // 4. Update the maps to reflect the new clientId.
            deviceIdToClientIdMap.set(deviceId, clientId)
            clientIdToDeviceIdMap.delete(existingClientId) // Clean up old mapping
            clientIdToDeviceIdMap.set(clientId, deviceId)
          } else {
            // This is a new device or the first time we're seeing it.
            const existingData = hrmDataRepository.findById(clientId)
            if (existingData) {
              const updatedData = { ...existingData, deviceId, ...metadata }
              hrmDataRepository.save(updatedData)

              // 5. Create the initial mapping.
              deviceIdToClientIdMap.set(deviceId, clientId)
              clientIdToDeviceIdMap.set(clientId, deviceId)
            }
          }
        } else {
          // Fallback for clients that don't send a deviceId.
          const existingData = hrmDataRepository.findById(clientId)
          if (existingData) {
            const updatedData = { ...existingData, ...metadata }
            hrmDataRepository.save(updatedData)
          }
        }
        broadcastState()
        break
      }
      case 'HRM_INPUT': {
        const existingData = hrmDataRepository.findById(clientId)
        const sessionState = clientSessionState.get(clientId)

        if (existingData && sessionState) {
          const now = Date.now()
          const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
          sessionState.lastUpdate = now

          let currentAccumulated = sessionState.accumulatedCalories
          const currentHr = message.data.value ?? existingData.value
          const currentAge = existingData.age ?? 30

          if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
            const caloriesBurned = estimateCaloriesBurned({
              heartRate: currentHr,
              age: currentAge,
              weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
              durationMinutes: dtMinutes,
            })
            currentAccumulated += caloriesBurned
          }

          // Update the internal state with high precision value
          sessionState.accumulatedCalories = currentAccumulated

          // ONLY update the value and calories
          hrmDataRepository.save({
            ...existingData,
            value: message.data.value ?? existingData.value,
            calories: Math.round(currentAccumulated * 10) / 10,
          })
        }
        broadcastState()
        break
      }

      case 'TIMER_COMMAND':
        services.tabataService.handleCommand(message.command)
        break

      case 'SET_MODE':
        services.tabataService.setMode(message.mode)
        break

      case 'TIMER_CONFIG':
        services.tabataService.setConfig({
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
            sendWebSocketMessage(
              target,
              executionMessage,
              'socketManager.SPOTIFY_COMMAND'
            )
          }
        })

        const spotifyService = services.spotifyService
        const spotifyCommandParams: {
          deviceId?: string
          volume?: number
          playlistUri?: string
          contextUri?: string
        } = {}
        if (commandMsg.deviceId)
          spotifyCommandParams.deviceId = commandMsg.deviceId
        if (commandMsg.volume !== undefined)
          spotifyCommandParams.volume = commandMsg.volume
        if (commandMsg.playlistUri)
          spotifyCommandParams.playlistUri = commandMsg.playlistUri
        if (commandMsg.contextUri)
          spotifyCommandParams.contextUri = commandMsg.contextUri

        spotifyService.handleCommand(commandMsg.command, spotifyCommandParams)
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
