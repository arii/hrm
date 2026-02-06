import {
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
} from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'
import { STALE_TILE_REMOVAL_THRESHOLD_MS } from '../constants/hrm'

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
    volume: 70,
    isMuted: false,
  },
  activeAlerts: [],
  spotifyServiceInitialized: false,
}

export const reducer = (
  state: WebSocketState,
  message: ServerMessage | { type: 'RESET_STATE' } | { type: 'PRUNE_STALE' }
): WebSocketState => {
  switch (message.type) {
    case 'PRUNE_STALE': {
      const now = Date.now()
      const filteredHrmData = state.hrmData.filter(
        (user) =>
          now - (user.lastUpdated || 0) < STALE_TILE_REMOVAL_THRESHOLD_MS
      )
      if (filteredHrmData.length === state.hrmData.length) {
        return state
      }
      return { ...state, hrmData: filteredHrmData }
    }
    case 'RESET_STATE':
      return INITIAL_STATE
    case 'INITIAL_STATE': {
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

      const mergedHrmData = state.hrmData.map((existingUser) => {
        if (incomingClients.has(existingUser.clientId)) {
          const updatedUser = payload.find(
            (newUser) => newUser.clientId === existingUser.clientId
          )
          return updatedUser
            ? {
                ...existingUser,
                ...updatedUser,
                isConnected: true,
                lastUpdated: now,
              }
            : { ...existingUser, isConnected: true, lastUpdated: now }
        }
        return existingUser
      })

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

      const filteredHrmData = mergedHrmData.filter(
        (user) =>
          now - (user.lastUpdated || 0) < STALE_TILE_REMOVAL_THRESHOLD_MS
      )

      return { ...state, hrmData: filteredHrmData }
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
      return state
    default:
      return state
  }
}
