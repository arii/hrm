'use client'
import throttle from 'lodash/throttle'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import {
  ClientCommandMessage,
  HrmMetric,
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
  UnifiedStateMessage,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'
import { HrmStaticMetadata } from '@/types/shared'

// --- Reducer State & Actions ---

interface WebSocketState {
  staticData: Map<string, HrmStaticMetadata>
  metrics: Map<string, HrmMetric>
  timer: TimerData
  spotify: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized: boolean
  connectionStatus: string
}

type WebSocketAction =
  | { type: 'INIT_SESSION'; payload: { initialUser?: HrmStaticMetadata } }
  | { type: 'SOCKET_CONNECT' }
  | { type: 'SOCKET_DISCONNECT' }
  | { type: 'SOCKET_ERROR' }
  | { type: 'UPDATE_STATE'; payload: UnifiedStateMessage }
  | { type: 'SET_ALERTS'; payload: ActiveAlert[] }
  | { type: 'SET_SPOTIFY_INIT'; payload: boolean }

// --- Reducer Logic ---

const webSocketReducer = (
  state: WebSocketState,
  action: WebSocketAction
): WebSocketState => {
  switch (action.type) {
    case 'INIT_SESSION': {
      const { initialUser } = action.payload
      const staticData = new Map(state.staticData)
      if (initialUser) {
        staticData.set(initialUser.clientId, initialUser)
      }
      return { ...state, staticData }
    }
    case 'SOCKET_CONNECT':
      return { ...state, connectionStatus: 'Connected' }
    case 'SOCKET_DISCONNECT':
      return { ...state, connectionStatus: 'Disconnected' }
    case 'SOCKET_ERROR':
      return { ...state, connectionStatus: 'Error' }
    case 'UPDATE_STATE': {
      const { hrmMetrics, timerData, spotifyData } = action.payload
      const newMetrics = new Map<string, HrmMetric>()
      hrmMetrics.forEach((metric) => newMetrics.set(metric.clientId, metric))
      return {
        ...state,
        metrics: newMetrics,
        timer: { ...state.timer, ...timerData },
        spotify: spotifyData,
      }
    }
    case 'SET_ALERTS':
      return { ...state, activeAlerts: action.payload }
    case 'SET_SPOTIFY_INIT':
      return { ...state, spotifyServiceInitialized: action.payload }
    default:
      return state
  }
}

// --- Derived Data ---

interface DerivedHrmData extends HrmStaticMetadata, HrmMetric {}

const deriveHrmData = (
  staticData: Map<string, HrmStaticMetadata>,
  metrics: Map<string, HrmMetric>
): DerivedHrmData[] => {
  const combinedData: DerivedHrmData[] = []
  metrics.forEach((metric, clientId) => {
    const staticInfo = staticData.get(clientId)
    combinedData.push({
      // Default static info if not found
      name: staticInfo?.name || 'Client',
      age: staticInfo?.age || 30,
      maxHr: staticInfo?.maxHr || 190,
      ...staticInfo,
      ...metric,
    })
  })
  return combinedData
}

// --- Context Definition ---

interface WebSocketContextType {
  hrmData: DerivedHrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized: boolean
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  dispatch: React.Dispatch<WebSocketAction>
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

// --- Provider Component ---

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const initialState: WebSocketState = {
    staticData: new Map(),
    metrics: new Map(),
    timer: {
      isRunning: false,
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
      workDuration: 30,
      restDuration: 10,
      soundEventId: 0,
    },
    spotify: {
      trackName: 'Awaiting Login...',
      artist: '',
      isPlaying: false,
      devices: [],
    },
    activeAlerts: [],
    spotifyServiceInitialized: true,
    connectionStatus: 'Connecting...',
  }

  const [state, dispatch] = useReducer(webSocketReducer, initialState)

  const throttledDispatch = useRef(
    throttle((message: UnifiedStateMessage) => {
      dispatch({ type: 'UPDATE_STATE', payload: message })
    }, 100)
  ).current

  const connect = useCallback(() => {
    const wsUrl = getWebSocketURL()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      dispatch({ type: 'SOCKET_CONNECT' })
      ws.send(JSON.stringify({ type: 'GET_STATE' }))
    }
    ws.onclose = () => dispatch({ type: 'SOCKET_DISCONNECT' })
    ws.onerror = () => dispatch({ type: 'SOCKET_ERROR' })

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)
        switch (message.type) {
          case 'STATE_UPDATE':
            throttledDispatch(message)
            break
          case 'INITIAL_STATE':
            // Can be deprecated or used for full hydration if needed
            break
          case 'ACTIVE_ALERTS_UPDATE':
            dispatch({ type: 'SET_ALERTS', payload: message.payload })
            break
          case 'SPOTIFY_SERVICE_INIT_UPDATE':
            dispatch({ type: 'SET_SPOTIFY_INIT', payload: message.payload })
            break
          case 'EXECUTE_SPOTIFY':
            window.dispatchEvent(
              new CustomEvent('spotify-remote-command', { detail: message })
            )
            break
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [throttledDispatch])

  useEffect(() => {
    connect()
    const timeoutRef = reconnectTimeoutRef.current
    return () => {
      wsRef.current?.close()
      if (timeoutRef) {
        clearTimeout(timeoutRef)
      }
    }
  }, [connect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const derivedHrmData = useMemo(
    () => deriveHrmData(state.staticData, state.metrics),
    [state.staticData, state.metrics]
  )

  const contextValue: WebSocketContextType = {
    hrmData: derivedHrmData,
    timerData: state.timer,
    spotifyData: state.spotify,
    activeAlerts: state.activeAlerts,
    spotifyServiceInitialized: state.spotifyServiceInitialized,
    connectionStatus: state.connectionStatus,
    sendData,
    dispatch,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// --- Custom Hook ---

export const useWebSocket = (initialUser?: HrmStaticMetadata) => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }

  useEffect(() => {
    console.log('initialUser', initialUser)
    console.log('context', context)
    if (initialUser) {
      context.dispatch({ type: 'INIT_SESSION', payload: { initialUser } })
    }
  }, [initialUser, context])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dispatch, ...rest } = context
  return rest
}
