'use client'
import throttle from 'lodash/throttle'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'

import {
  ActiveAlert,
  ClientCommandMessage,
  HrmData as ServerHrmData,
  ServerMessage,
  SpotifyData,
  TimerData,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

// Client-side extension of HrmData to include connection status
export interface HrmData extends ServerHrmData {
  isConnected: boolean
}

interface WebSocketState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  activeAlerts: ActiveAlert[]
  spotifyServiceInitialized?: boolean
}

const INITIAL_STATE: WebSocketState = {
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
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
}

export interface WebSocketContextType extends WebSocketState {
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
  const reducer = (
    state: WebSocketState,
    message: ServerMessage
  ): WebSocketState => {
    switch (message.type) {
      case 'INITIAL_STATE': {
        // When the initial state is loaded, ensure all HRM data is marked as connected.
        const hrmDataWithConnection =
          message.payload.hrmData?.map((d) => ({ ...d, isConnected: true })) ||
          []
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
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
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
