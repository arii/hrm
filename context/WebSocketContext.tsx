'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useReducer,
  useState,
} from 'react'

import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  ServerBroadcastMessage,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

// --- App State Interfaces and Initial State ---
interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized: boolean
}

const initialState: AppState = {
  hrmData: [],
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
  spotifyData: { trackName: 'Awaiting Login...', artist: '', isPlaying: false },
  spotifyServiceInitialized: true,
}

// --- State Management Reducer ---
type StateAction =
  | { type: 'SET_INITIAL_STATE'; payload: AppState }
  | { type: 'UPDATE_HRM'; payload: HrmData[] }
  | { type: 'UPDATE_TIMER'; payload: TimerData }
  | { type: 'UPDATE_SPOTIFY'; payload: SpotifyData }

const appStateReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'SET_INITIAL_STATE':
      return action.payload
    case 'UPDATE_HRM':
      return { ...state, hrmData: action.payload }
    case 'UPDATE_TIMER':
      return { ...state, timerData: action.payload }
    case 'UPDATE_SPOTIFY':
      return { ...state, spotifyData: action.payload }
    default:
      return state
  }
}

// --- WebSocket Context Definition ---
interface WebSocketContextType extends AppState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

// --- WebSocket Provider Component ---
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
  const pendingActions = useRef<ClientCommandMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  // Use the reducer for state management
  const [appState, dispatch] = useReducer(appStateReducer, initialState)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
    console.log('[WebSocketProvider] Manually disconnected.')
  }, [])

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (pendingActions.current.length > 0) {
        console.log(`[WebSocketProvider] Sending ${pendingActions.current.length} pending actions.`)
        pendingActions.current.forEach(action => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log(
        '[WebSocketProvider] Disconnected from server',
        event.code,
        event.reason
      )
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocketProvider] Attempting to reconnect...')
          setConnectionStatus('Reconnecting...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = (_err) => {
      console.warn('[WebSocketProvider] Connection error')
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      try {
        const message: ServerBroadcastMessage = JSON.parse(event.data)

        // Use the reducer to dispatch actions based on message type
        switch (message.type) {
          case 'INITIAL_STATE':
            dispatch({ type: 'SET_INITIAL_STATE', payload: message.payload })
            break
          case 'HRM_UPDATE':
            dispatch({ type: 'UPDATE_HRM', payload: message.payload })
            break
          case 'TIMER_UPDATE':
            dispatch({ type: 'UPDATE_TIMER', payload: message.payload })
            break
          case 'SPOTIFY_UPDATE':
            dispatch({ type: 'UPDATE_SPOTIFY', payload: message.payload })
            break
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(data)
      console.log('[WebSocketProvider] Sending:', data)
      ws.send(jsonStr)
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open, queueing action. State:',
        ws?.readyState,
        'Data:',
        data
      )
      pendingActions.current.push(data)
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions.current))
    }
  }, [])

  const contextValue = {
    ...appState,
    connectionStatus,
    sendData,
    connect,
    disconnect,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// --- Custom Hook to consume the context ---
export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
