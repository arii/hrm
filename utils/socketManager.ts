// utils/socketManager.ts
import { WebSocket, WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import {
  HrmDataMessage,
  IncomingMessage,
  SpotifyDataMessage,
  TimerDataMessage,
  TimerMode,
  UserMetrics,
  WebSocketMessage,
  SpotifyPlayingStateMessage,
  ActiveAlertsMessage,
  UserSettingsMessage,
  SpotifyServiceStatus,
  SpotifyServiceStatusMessage,
} from '@/types/websocket'
import { serviceContainer } from '@/services/serviceContainer'
import { ExtendedWebSocket } from '@/types/webSocket'
import { TimerState, timerState } from '@/services/timer/timerState'
import logger from './logger.server'
import { CLIENT_SESSION_TIMEOUT_MS } from '@/lib/env'

const {
  spotifyPollingService,
  timerService,
  alertService,
  userSettingsService,
} = serviceContainer

const getTimerData = (timerState: TimerState): TimerDataMessage['data'] => {
  return {
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    mode: timerState.mode,
    currentPhase: timerState.currentPhase,
    timeRemaining: timerState.timeRemaining,
    workDuration: timerState.workDuration,
    restDuration: timerState.restDuration,
    totalRounds: timerState.totalRounds,
    currentRound: timerState.currentRound,
  }
}
const send = (ws: WebSocket, message: WebSocketMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

const broadcast = (wss: WebSocketServer, message: WebSocketMessage) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      send(client, message)
    }
  })
}

// In-memory session management
// Maps clientId to the last seen timestamp
const clientSessions = new Map<string, number>()

const markClientAsSeen = (clientId: string) => {
  clientSessions.set(clientId, Date.now())
}

const removeClientSession = (clientId: string) => {
  clientSessions.delete(clientId)
}

const getStaleClientIds = (): string[] => {
  const staleClients: string[] = []
  const now = Date.now()
  for (const [clientId, lastSeen] of clientSessions.entries()) {
    if (now - lastSeen > CLIENT_SESSION_TIMEOUT_MS) {
      staleClients.push(clientId)
    }
  }
  return staleClients
}
// Centralized state broadcasting
export const broadcastTimerData = (wss: WebSocketServer) => {
  const message: TimerDataMessage = {
    type: 'TIMER_DATA',
    data: getTimerData(timerState),
  }
  broadcast(wss, message)
}
export const broadcastHrmData = (
  wss: WebSocketServer,
  hrmData: HrmDataMessage['data']
) => {
  const message: HrmDataMessage = { type: 'HRM_DATA', data: hrmData }
  broadcast(wss, message)
}
export const broadcastSpotifyData = (
  wss: WebSocketServer,
  spotifyData: SpotifyDataMessage['data']
) => {
  const message: SpotifyDataMessage = {
    type: 'SPOTIFY_DATA',
    data: spotifyData,
  }
  broadcast(wss, message)
}
export const broadcastSpotifyPlayingState = (
  wss: WebSocketServer,
  isPlaying: boolean,
  track: SpotifyDataMessage['data']['track']
) => {
  const message: SpotifyPlayingStateMessage = {
    type: 'SPOTIFY_PLAYING_STATE',
    data: { isPlaying, track },
  }
  broadcast(wss, message)
}
export const broadcastActiveAlerts = (
  wss: WebSocketServer,
  alerts: ActiveAlertsMessage['data']
) => {
  const message: ActiveAlertsMessage = {
    type: 'ACTIVE_ALERTS',
    data: alerts,
  }
  broadcast(wss, message)
}
export const broadcastUserSettings = (
  wss: WebSocketServer,
  settings: UserSettingsMessage['data']
) => {
  const message: UserSettingsMessage = {
    type: 'USER_SETTINGS',
    data: settings,
  }
  broadcast(wss, message)
}
export const broadcastSpotifyServiceStatus = (
  wss: WebSocketServer,
  status: SpotifyServiceStatus
) => {
  const message: SpotifyServiceStatusMessage = {
    type: 'SPOTIFY_SERVICE_STATUS',
    data: { status },
  }
  broadcast(wss, message)
}
const handleIncomingMessage = (
  ws: ExtendedWebSocket,
  message: Buffer,
  wss: WebSocketServer
) => {
  try {
    const parsedMessage: IncomingMessage = JSON.parse(message.toString())
    markClientAsSeen(ws.clientId) // Mark active on any valid message

    switch (parsedMessage.type) {
      case 'PONG':
        // No action needed, liveness is already updated by markClientAsSeen
        break
      case 'TIMER_COMMAND':
        timerService.handleCommand(parsedMessage.command, wss)
        break
      case 'TIMER_CONFIG':
        timerService.handleConfig(parsedMessage, wss)
        break
      case 'SET_MODE':
        if (Object.values(TimerMode).includes(parsedMessage.mode)) {
          timerService.setMode(parsedMessage.mode, wss)
        }
        break
      case 'SPOTIFY_COMMAND': {
        const { command, deviceId } = parsedMessage
        spotifyPollingService.handleControlCommand(command, deviceId)
        break
      }
      case 'UPDATE_USER_METRICS': {
        const metrics: UserMetrics = parsedMessage.metrics
        userSettingsService.updateUserMetrics(metrics)
        broadcastUserSettings(wss, userSettingsService.getSettings())
        break
      }
      default:
        logger.warn(
          { type: (parsedMessage as { type: string }).type },
          'Unknown message type received'
        )
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process incoming WebSocket message')
  }
}
export const initializeWebSocket = (wss: WebSocketServer) => {
  // Periodic cleanup of stale sessions
  const cleanupInterval = setInterval(() => {
    const staleClients = getStaleClientIds()
    if (staleClients.length > 0) {
      logger.info(
        { clients: staleClients },
        `Stale client cleanup: ${staleClients.length} sessions removed.`
      )
      staleClients.forEach((clientId) => {
        // Find the WebSocket instance and terminate it
        const wsToTerminate = [...wss.clients].find(
          (c) => (c as ExtendedWebSocket).clientId === clientId
        )
        if (wsToTerminate) {
          wsToTerminate.terminate() // This will trigger the 'close' event
        }
        removeClientSession(clientId) // Also remove from session map
      })
    }
  }, CLIENT_SESSION_TIMEOUT_MS) // Run cleanup slightly more frequently than timeout

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.clientId = uuidv4()
    markClientAsSeen(ws.clientId)
    logger.info({ clientId: ws.clientId }, 'Client connected')

    // Send initial state immediately on connection
    send(ws, { type: 'CLIENT_ID', clientId: ws.clientId })
    send(ws, { type: 'TIMER_DATA', data: getTimerData(timerState) })
    send(ws, { type: 'HRM_DATA', data: [] })
    send(ws, {
      type: 'SPOTIFY_DATA',
      data: spotifyPollingService.getCurrentTrack(),
    })
    send(ws, {
      type: 'ACTIVE_ALERTS',
      data: alertService.getActiveAlerts(),
    })
    send(ws, {
      type: 'USER_SETTINGS',
      data: userSettingsService.getSettings(),
    })
    send(ws, {
      type: 'SPOTIFY_SERVICE_STATUS',
      data: { status: spotifyPollingService.getServiceStatus() },
    })

    ws.on('message', (message: Buffer) =>
      handleIncomingMessage(ws, message, wss)
    )

    ws.on('close', () => {
      logger.info({ clientId: ws.clientId }, 'Client disconnected')
      // Immediate session removal on explicit close
      removeClientSession(ws.clientId)
    })

    ws.on('error', (error) => {
      logger.error({ clientId: ws.clientId, error }, 'WebSocket error')
    })
  })

  // Set up a periodic ping to all clients to check for liveness
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extWs = client as ExtendedWebSocket
      try {
        send(extWs, { type: 'PING' })
      } catch (err) {
        logger.error(
          { clientId: extWs.clientId, error: err },
          'Error sending PING to client'
        )
      }
    })
  }, 30000) // 30 seconds

  // Stop periodic tasks on server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval)
    clearInterval(cleanupInterval)
  })
}
