'use client'
import throttle from 'lodash/throttle'
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
  ActiveAlert,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

// --- State Management (largely unchanged) ---
interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
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
  spotifyData: {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
}

const reducer = (state: AppState, message: ServerMessage): AppState => {
  switch (message.type) {
    case 'INITIAL_STATE':
      return { ...state, ...message.payload }
    case 'HRM_UPDATE':
      return { ...state, hrmData: message.payload }
    case 'TIMER_UPDATE':
      return { ...state, timerData: message.payload }
    case 'SPOTIFY_UPDATE':
      return { ...state, spotifyData: message.payload }
    case 'ACTIVE_ALERTS_UPDATE':
      return { ...state, activeAlerts: message.payload }
    case 'SPOTIFY_SERVICE_INIT_UPDATE':
      return { ...state, spotifyServiceInitialized: message.payload }
    case 'EXECUTE_SPOTIFY':
      // This is handled by a global event listener, not state change
      return state
    default:
      return state
  }
}

// --- Context Definition ---
export interface WebSocketContextType extends AppState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

// --- Provider Implementation (Refactored with Robust Hook Logic) ---
export const WebSocketProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode
  serverUrl?: string
}) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const ws = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>(
    'CLOSED'
  )
  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)

  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => {
      dispatch(message)
    }, 100)
  ).current

  const onMessage = useCallback(
    (event: MessageEvent) => {
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
          dispatch(message)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    },
    [throttledDispatch]
  )

  const connectRef = useRef<() => void>()

  const connect = useCallback(() => {
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    setStatus('CONNECTING')
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setStatus('OPEN')
      // On connect, request the initial state
      ws.current?.send(JSON.stringify({ type: 'GET_STATE' }))
    }

    ws.current.onmessage = onMessage

    ws.current.onclose = () => {
      console.log('[WebSocketProvider] Disconnected. Reconnecting...')
      setStatus('CLOSED')
      // Use the ref to avoid stale closures and TDZ issues.
      setTimeout(() => connectRef.current?.(), 1000)
    }

    ws.current.onerror = (err) => {
      console.error('[WebSocketProvider] Connection error', err)
      // The onclose event will fire next, triggering reconnection logic.
    }
  }, [wsUrl, onMessage])

  // Keep the ref updated with the latest connect function on every render.
  useEffect(() => {
    connectRef.current = connect
  })

  useEffect(() => {
    connectRef.current?.()
    return () => {
      // Prevent reconnection logic from firing on unmount
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
      }
    }
  }, [])

  const sendData = useCallback((data: ClientCommandMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocketProvider] Sending:', data)
      ws.current.send(JSON.stringify(data))
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open, message dropped. State:',
        ws.current?.readyState,
        'Data:',
        data
      )
    }
  }, [])

  const mapStatusToString = (s: typeof status): string => {
    switch (s) {
      case 'CONNECTING':
        return 'Connecting...'
      case 'OPEN':
        return 'Connected'
      case 'CLOSED':
        return 'Disconnected'
    }
  }

  const contextValue: WebSocketContextType = {
    ...appState,
    connectionStatus: mapStatusToString(status),
    sendData,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// --- Hook for consuming context ---
export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
