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

//
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

export interface WebSocketContextType extends AppState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
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

  // Refs for connection management
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const isPageVisible = useRef(true) // Track visibility to pause reconnections if needed
  const shouldReconnect = useRef(true)
  const pendingActions = useRef<ClientCommandMessage[]>([])

  // Configuration for exponential backoff
  const MAX_RECONNECT_ATTEMPTS = 10
  const INITIAL_RECONNECT_DELAY = 1000
  const JITTER_FACTOR = 0.2

  // Unified State Object managed by a reducer
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
        return state
      default:
        return state
    }
  }

  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)

  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => {
      dispatch(message)
    }, 100)
  ).current

  // Load pending actions from storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
    }
  }, [])

  // The Connect Function
  const connect = useCallback(() => {
    // Prevent duplicate connections or connecting when offline
    if (
      typeof window === 'undefined' ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    if (!navigator.onLine) {
      setConnectionStatus('Offline')
      return
    }

    shouldReconnect.current = true
    setConnectionStatus('Connecting...')

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true
      }

      ws.send(JSON.stringify({ type: 'GET_STATE' }))

      // Flush pending actions
      if (pendingActions.current.length > 0) {
        console.log(`[WebSocket] Sending ${pendingActions.current.length} pending actions.`)
        pendingActions.current.forEach((action) => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      // Reset Resilience Counters
      reconnectAttempts.current = 0
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log('[WebSocketProvider] Disconnected', event.code, event.reason)
      setConnectionStatus('Disconnected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = false
      }

      wsRef.current = null // Clear ref on close

      if (shouldReconnect.current && navigator.onLine && isPageVisible.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++

          // Exponential Backoff with Jitter
          const delay = INITIAL_RECONNECT_DELAY * 2 ** (reconnectAttempts.current - 1)
          const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5)
          const reconnectDelay = Math.min(delay + jitter, 30000) // Cap at 30s

          console.log(`[WebSocket] Reconnecting attempt ${reconnectAttempts.current} in ${reconnectDelay.toFixed(0)}ms`)
          setConnectionStatus(`Reconnecting (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        } else {
          console.error('[WebSocket] Max reconnection attempts reached.')
          setConnectionStatus('Connection Lost. Refresh to try again.')
        }
      }
    }

    ws.onerror = (_err) => {
      console.warn('[WebSocket] Connection error')
      // onError usually precedes onClose, so we handle logic in onClose
    }

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
          dispatch(message)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl, throttledDispatch])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    console.log('[WebSocket] Manually disconnected.')
  }, [])

  // --- Network & Visibility Event Listeners (Issue #721 Resolution) ---
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WebSocket] Network online detected. Reconnecting immediately.')
      // Reset attempts so we get a fresh set of tries
      reconnectAttempts.current = 0
      setConnectionStatus('Network Recovered. Reconnecting...')
      connect()
    }

    const handleOffline = () => {
      console.log('[WebSocket] Network offline detected. Pausing reconnection.')
      setConnectionStatus('Offline')
      // We don't necessarily need to close the socket here; browser will timeout/close it.
      // But we can pause active reconnection loops.
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    const handleVisibilityChange = () => {
      isPageVisible.current = document.visibilityState === 'visible'
      if (isPageVisible.current && !wsRef.current && navigator.onLine) {
        console.log('[WebSocket] Tab visible. Reconnecting if disconnected.')
        reconnectAttempts.current = 0 // Optional: Reset attempts on tab focus
        connect()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Initial connection
    connect()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      disconnect()
    }
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(data)
      ws.send(jsonStr)
    } else {
      console.warn('[WebSocket] Socket not open, queueing action.', data)
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

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
