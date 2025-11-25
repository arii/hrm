'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useReducer,
} from 'react'
import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  ServerMessage,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

const INITIAL_STATE: AppState = {
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

type Action =
  | { type: 'INITIAL_STATE'; payload: AppState }
  | { type: 'HRM_UPDATE'; payload: HrmData[] }
  | { type: 'TIMER_UPDATE'; payload: TimerData }
  | { type: 'SPOTIFY_UPDATE'; payload: SpotifyData }

const appStateReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIAL_STATE':
      return action.payload
    case 'HRM_UPDATE':
      return { ...state, hrmData: action.payload }
    case 'TIMER_UPDATE':
      return { ...state, timerData: action.payload }
    case 'SPOTIFY_UPDATE':
      return { ...state, spotifyData: action.payload }
    default:
      return state
  }
}

interface WebSocketContextType extends AppState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

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

  const [appState, dispatch] = useReducer(appStateReducer, INITIAL_STATE)

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

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
    console.log('[useWebSocket] Manually disconnected.')
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
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (pendingActions.current.length > 0) {
        console.log(
          `[useWebSocket] Sending ${pendingActions.current.length} pending actions.`
        )
        pendingActions.current.forEach((action) => {
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
        const message: ServerMessage = JSON.parse(event.data)
        switch (message.type) {
          case 'INITIAL_STATE':
            dispatch({ type: 'INITIAL_STATE', payload: message.payload })
            break
          case 'HRM_UPDATE':
            dispatch({ type: 'HRM_UPDATE', payload: message.payload })
            break
          case 'TIMER_UPDATE':
            dispatch({ type: 'TIMER_UPDATE', payload: message.payload })
            break
          case 'SPOTIFY_UPDATE':
            dispatch({ type: 'SPOTIFY_UPDATE', payload: message.payload })
            break
          default:
            console.warn('Unknown message type received from server:', message)
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
      localStorage.setItem(
        'pendingActions',
        JSON.stringify(pendingActions.current)
      )
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

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
