import {
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
} from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'

// Client-side extension of HrmData to include connection status
export interface HrmData extends ServerHrmData {
  isConnected: boolean
  lastUpdated?: number
}

export interface WebSocketState {
  hrmData: HrmData[]
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
    trackId: null,
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volumePercent: 70,
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
      const hrmDataWithConnection =
        message.payload.hrmData?.map((d) => ({ ...d, isConnected: true })) || []
      return {
        ...state,
        ...message.payload,
        hrmData: hrmDataWithConnection,
      }
    }
    case 'HRM_UPDATE': {
      const now = Date.now()
      const payload = message.payload as ServerHrmData[]
      const incomingClients = new Set(payload.map((user) => user.clientId))

      // THE FIX: Immediately filter out any devices that are NOT in the incoming payload.
      // This ensures the client state perfectly mirrors the server's HrmDataStore.
      const activeHrmData = state.hrmData.filter((existing) =>
        incomingClients.has(existing.clientId)
      )

      // Update existing users with new data
      const mergedHrmData = activeHrmData.map((existingUser) => {
        const updatedUser = payload.find(
          (newUser) => newUser.clientId === existingUser.clientId
        )
        return {
          ...existingUser,
          ...updatedUser,
          isConnected: true,
          lastUpdated: now,
        }
      })

      // Add brand-new users from the payload
      payload.forEach((newUser) => {
        if (
          !mergedHrmData.some(
            (existingUser) => existingUser.clientId === newUser.clientId
          )
        ) {
          mergedHrmData.push({
            ...newUser,
            isConnected: true,
            lastUpdated: now,
          })
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
    case 'ACTIVE_ALERTS_UPDATE':
      return { ...state, activeAlerts: message.payload }
    case 'SPOTIFY_SERVICE_INIT_UPDATE':
      return { ...state, spotifyServiceInitialized: message.payload }
    case 'EXECUTE_SPOTIFY':
      // This message type is handled by useSpotifyRemoteExecution hook
      // We don't need to update state here, just pass it through
      return state
    default:
      return state
  }
}
