import {
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
  ConnectedHrmData,
} from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'

export interface WebSocketState {
  hrmData: ConnectedHrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized?: boolean
}

export const INITIAL_STATE: WebSocketState = {
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    caloriesBurned: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    devices: [],
    playback: {
      track: {
        id: null,
        name: 'Awaiting Login...',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      isMuted: false,
      volume_percent: 70,
      progress_ms: 0,
    },
  },
  activeAlerts: [],
  spotifyServiceInitialized: false,
}

export const reducer = (
  state: WebSocketState,
  message: ServerMessage | { type: 'RESET_STATE' }
): WebSocketState => {
  switch (message.type) {
    case 'RESET_STATE':
      return INITIAL_STATE
    case 'INITIAL_STATE': {
      // When the initial state is loaded, ensure all HRM data is marked as connected.
      // We use the client's current time for lastUpdated to prevent clock skew issues.
      const now = Date.now()
      const hrmDataWithConnection =
        message.payload.hrmData?.map((d) => ({
          ...d,
          isConnected: true,
          lastUpdated: now,
        })) || []
      return {
        ...state,
        ...message.payload,
        hrmData: hrmDataWithConnection,
      }
    }
    case 'HRM_UPDATE': {
      const payload = message.payload as ServerHrmData[]
      const now = Date.now()

      const mergedHrmData = payload.map((newUser) => {
        const existingUser = state.hrmData.find(
          (d) => d.clientId === newUser.clientId
        )
        const isFresh =
          !existingUser || existingUser.updatedAt !== newUser.updatedAt

        return {
          ...existingUser,
          ...newUser,
          isConnected: true,
          lastUpdated: isFresh ? now : existingUser.lastUpdated || now,
        }
      })

      return { ...state, hrmData: mergedHrmData }
    }
    case 'DEVICE_OFFLINE': {
      const { deviceId } = message.payload
      return {
        ...state,
        hrmData: state.hrmData.filter((device) => device.clientId !== deviceId),
      }
    }
    case 'TIMER_UPDATE':
      return {
        ...state,
        timerData: { ...state.timerData, ...message.payload },
      }
    case 'SPOTIFY_UPDATE':
      return {
        ...state,
        spotifyData: { ...state.spotifyData, ...message.payload },
      }
    case 'ACTIVE_ALERTS_UPDATE': {
      const now = Date.now()
      const adjustedAlerts = message.payload.map((alert) => ({
        ...alert,
        timestamp: now,
      }))
      return { ...state, activeAlerts: adjustedAlerts }
    }
    case 'SPOTIFY_SERVICE_INIT_UPDATE':
      return { ...state, spotifyServiceInitialized: message.payload }
    default:
      return state
  }
}
