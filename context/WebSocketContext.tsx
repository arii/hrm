'use client'
import throttle from 'lodash/throttle'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
} from 'react'
import {
  ClientCommandMessage,
  HrmMetric,
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
  InitialStateSnapshotPayload,
} from '../types/websocket'
import { HrmStaticMetadata } from '../types/shared'
import { getWebSocketURL } from '../utils/urls'

// The new combined data structure for UI components
export interface HrmDataDisplay {
  clientId: string
  name: string
  age?: number
  maxHr?: number
  value: number
  percentMax: number
  connected: boolean
}

// 1. Define Reducer State & Actions
interface WebSocketState {
  staticData: Map<string, HrmStaticMetadata>
  metrics: Map<string, HrmMetric>
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized: boolean
}

type WebSocketAction =
  | { type: 'SEED_METADATA'; payload: HrmStaticMetadata }
  | { type: 'INITIAL_STATE'; payload: InitialStateSnapshotPayload }
  | { type: 'HRM_UPDATE'; payload: HrmMetric[] }
  | { type: 'TIMER_UPDATE'; payload: TimerData }
  | { type: 'SPOTIFY_UPDATE'; payload: SpotifyData }
  | { type: 'ACTIVE_ALERTS_UPDATE'; payload: ActiveAlert[] }
  | { type: 'SPOTIFY_SERVICE_INIT_UPDATE'; payload: boolean }

const INITIAL_STATE: WebSocketState = {
  staticData: new Map(),
  metrics: new Map(),
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
}

const reducer = (
  state: WebSocketState,
  action: WebSocketAction
): WebSocketState => {
  switch (action.type) {
    case 'SEED_METADATA': {
      const newStaticData = new Map(state.staticData)
      newStaticData.set(action.payload.clientId, action.payload)
      return { ...state, staticData: newStaticData }
    }
    case 'INITIAL_STATE': {
      const newMetrics = new Map<string, HrmMetric>()
      action.payload.hrmMetrics.forEach((metric) => {
        newMetrics.set(metric.clientId, metric)
      })
      return {
        ...state,
        metrics: newMetrics,
        timerData: action.payload.timerData,
        spotifyData: action.payload.spotifyData,
        spotifyServiceInitialized:
          action.payload.spotifyServiceInitialized ?? false,
      }
    }
    case 'HRM_UPDATE': {
      const updatedMetrics = new Map(state.metrics)
      action.payload.forEach((metric) => {
        updatedMetrics.set(metric.clientId, metric)
      })
      return { ...state, metrics: updatedMetrics }
    }
    case 'TIMER_UPDATE':
      return { ...state, timerData: action.payload }
    case 'SPOTIFY_UPDATE':
      return { ...state, spotifyData: action.payload }
    case 'ACTIVE_ALERTS_UPDATE':
      return { ...state, activeAlerts: action.payload }
    case 'SPOTIFY_SERVICE_INIT_UPDATE':
      return { ...state, spotifyServiceInitialized: action.payload }
    default:
      return state
  }
}

// Note: The context now exposes derived hrmData, not the raw maps
export interface WebSocketContextType {
  hrmData: HrmDataDisplay[]
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized: boolean
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
  seedLocalUser: (user: HrmStaticMetadata) => void
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const WebSocketProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode
  serverUrl?: string
}) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const pendingActions = useRef<ClientCommandMessage[]>([])

  const MAX_RECONNECT_ATTEMPTS = 10
  const INITIAL_RECONNECT_DELAY = 1000
  const JITTER_FACTOR = 0.2

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => {
      // The reducer now expects a specific action format
      if (message.type !== 'EXECUTE_SPOTIFY') {
        dispatch(message as WebSocketAction)
      }
    }, 100)
  ).current

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
    }
  }, [])

  const connect = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return
    }
    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => {
      setConnectionStatus('Connected')
      ws.send(JSON.stringify({ type: 'GET_STATE' }))
      reconnectAttempts.current = 0
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
    ws.onclose = () => {
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          const delay = INITIAL_RECONNECT_DELAY * 2 ** reconnectAttempts.current
          const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5)
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('Reconnecting...')
            connectRef.current()
          }, delay + jitter)
        } else {
          setConnectionStatus('Failed to connect.')
        }
      }
    }
    ws.onerror = () => setConnectionStatus('Error')
    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)
        if (message.type === 'EXECUTE_SPOTIFY') {
          window.dispatchEvent(
            new CustomEvent('spotify-remote-command', { detail: message })
          )
          return
        }
        if (message.type === 'HRM_UPDATE' || message.type === 'TIMER_UPDATE') {
          throttledDispatch(message)
        } else {
          dispatch(message as WebSocketAction)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl, throttledDispatch])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    connectRef.current = connect
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const seedLocalUser = useCallback((user: HrmStaticMetadata) => {
    dispatch({ type: 'SEED_METADATA', payload: user })
  }, [])

  // 3. Implement Merge Logic: Expose a derived hrmData array
  const derivedHrmData = useMemo((): HrmDataDisplay[] => {
    const combinedData = new Map<string, HrmDataDisplay>()

    // Initialize with static data
    state.staticData.forEach((meta, clientId) => {
      combinedData.set(clientId, {
        ...meta,
        value: 0,
        percentMax: 0,
        connected: false,
      })
    })

    // Merge in live metrics
    state.metrics.forEach((metric, clientId) => {
      const existing = combinedData.get(clientId)
      if (existing) {
        // Update existing entry (from static data)
        existing.value = metric.value
        existing.percentMax = metric.percentMax
        existing.connected = metric.connected
      } else {
        // Create new entry for clients without static data (e.g., other HRM users)
        combinedData.set(clientId, {
          clientId: metric.clientId,
          name: `User-${metric.clientId.substring(0, 4)}`, // Fallback name
          value: metric.value,
          percentMax: metric.percentMax,
          connected: metric.connected,
        })
      }
    })

    return Array.from(combinedData.values())
  }, [state.staticData, state.metrics])

  const contextValue: WebSocketContextType = {
    timerData: state.timerData,
    spotifyData: state.spotifyData,
    activeAlerts: state.activeAlerts,
    spotifyServiceInitialized: state.spotifyServiceInitialized,
    hrmData: derivedHrmData,
    connectionStatus,
    sendData,
    connect,
    disconnect,
    seedLocalUser,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
