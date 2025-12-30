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
    phase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    cycle: 0,
    totalCycles: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackName: 'Awaiting Login...',
    artistName: '',
    albumArtUrl: '',
    isPlaying: false,
    durationMs: 0,
    progressMs: 0,
    volumePercent: 70,
    devices: [],
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
      const payload = message.payload as ServerHrmData[]
      // Create a map of incoming clientIds for efficient lookup
      const incomingClients = new Set(payload.map((user) => user.clientId))

      // Create a new state array by merging existing and new data
      const mergedHrmData = state.hrmData.map((existingUser) => {
        if (incomingClients.has(existingUser.clientId)) {
          const updatedUser = payload.find(
            (newUser) => newUser.clientId === existingUser.clientId
          )
          // CRITICAL FIX: The order of spread operators is essential.
          // By spreading existingUser first, then updatedUser, we ensure
          // that any fields NOT present in the (potentially partial) `updatedUser`
          // payload are preserved from the existing state.
          return updatedUser
            ? {
                ...existingUser,
                ...updatedUser,
                isConnected: true,
              }
            : { ...existingUser, isConnected: true }
        }
        return { ...existingUser, isConnected: false }
      })

      // Add any brand-new users from the payload who were not in the previous state
      payload.forEach((newUser) => {
        if (
          !state.hrmData.some(
            (existingUser) => existingUser.clientId === newUser.clientId
          )
        ) {
          mergedHrmData.push({ ...newUser, isConnected: true })
        }
      })

      return { ...state, hrmData: mergedHrmData }
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
