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
  const [connectionStatus, setConnectionStatus] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__MOCK_WEB_SOCKET_DATA__
    ) {
      return 'Connected (Mocked)'
    }
    return 'Connecting...'
  })
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const pendingActions = useRef<ClientCommandMessage[]>([])
  // Refs for heartbeat mechanism
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration for exponential backoff
  const MAX_RECONNECT_ATTEMPTS = 10
  const INITIAL_RECONNECT_DELAY = 1000 // 1 second
  const JITTER_FACTOR = 0.2 // 20% jitter

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
        // This message type is handled by useSpotifyRemoteExecution hook
        // We don't need to update state here, just pass it through
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

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  // Ref to hold the connect function, ensuring it's always up-to-date
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__MOCK_WEB_SOCKET_DATA__) {
      dispatch({
        type: 'INITIAL_STATE',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: (window as any).__MOCK_WEB_SOCKET_DATA__,
      })
      return // Skip WebSocket connection logic
    }

    const savedActions = localStorage.getItem('pendingActions')
    if (savedActions) {
      pendingActions.current = JSON.parse(savedActions)
    }
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current)
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    stopHeartbeat() // Ensure no existing timers are running

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }))

        // Expect a pong within 5 seconds
        pongTimeoutRef.current = setTimeout(() => {
          console.warn(
            '[WebSocketProvider] Pong not received in time. Connection may be stale. Forcing reconnect.'
          )
          wsRef.current?.close() // Triggers the onclose reconnect logic
        }, 5000)
      }
    }, 30000)
  }, [stopHeartbeat])

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

      // Set test flag for Playwright tests - use a more reliable method
      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true
      }

      // Explicitly request initial state from the server
      ws.send(JSON.stringify({ type: 'GET_STATE' }))

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

      // Reset reconnect attempts on successful connection
      reconnectAttempts.current = 0

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      // Start the client-side heartbeat
      startHeartbeat()
    }

    ws.onclose = (event) => {
      console.log(
        '[WebSocketProvider] Disconnected from server',
        event.code,
        event.reason
      )
      setConnectionStatus('Disconnected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = false
      }

      // Stop heartbeat on disconnect
      stopHeartbeat()

      if (shouldReconnect.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          const delay =
            INITIAL_RECONNECT_DELAY * 2 ** (reconnectAttempts.current - 1)
          const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5)
          const reconnectDelay = delay + jitter

          console.log(
            `[WebSocketProvider] Reconnection attempt ${reconnectAttempts.current} in ${reconnectDelay.toFixed(0)}ms`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('Reconnecting...')
            connectRef.current()
          }, reconnectDelay)
        } else {
          console.error(
            '[WebSocketProvider] Max reconnection attempts reached.'
          )
          setConnectionStatus(
            'Failed to connect. Please check your connection and refresh the page.'
          )
        }
      }
    }

    ws.onerror = (_err) => {
      console.warn('[WebSocketProvider] Connection error')
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)

        // Heartbeat pong check
        if (message.type === 'PONG') {
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current)
          }
          return // Pong message is handled, no state dispatch needed
        }

        // Handle EXECUTE_SPOTIFY messages specially - they need to be processed by useSpotifyRemoteExecution
        if (message.type === 'EXECUTE_SPOTIFY') {
          // Dispatch a custom event that the remote execution hook can listen to
          window.dispatchEvent(
            new CustomEvent('spotify-remote-command', {
              detail: message,
            })
          )
          return
        }

        // Throttle high-frequency messages
        if (message.type === 'HRM_UPDATE' || message.type === 'TIMER_UPDATE') {
          throttledDispatch(message)
        } else {
          // Dispatch critical messages immediately
          dispatch(message)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl, throttledDispatch, startHeartbeat, stopHeartbeat])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    // Stop heartbeat on manual disconnect
    stopHeartbeat()
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
    console.log('[useWebSocket] Manually disconnected.')
  }, [stopHeartbeat])

  useEffect(() => {
    connectRef.current = connect
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
