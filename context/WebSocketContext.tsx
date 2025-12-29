'use client'
import throttle from 'lodash.throttle'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useReducer,
  useMemo,
} from 'react'
import { ClientCommandMessage, ServerMessage } from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'
import { getWebSocketURL } from '../utils/urls'
import { INITIAL_STATE, WebSocketState } from './webSocketReducer'

// Client-side extension of HrmData to include connection status
export interface HrmData extends ServerHrmData {
  isConnected: boolean
}

export interface WebSocketContextType extends WebSocketState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

// Unified State Object managed by a reducer
export const reducer = (
  state: WebSocketState,
  message: ServerMessage | { type: 'RESET_STATE' }
): WebSocketState => {
  switch (message.type) {
    case 'RESET_STATE':
      return INITIAL_STATE
    case 'INITIAL_STATE': {
      // When the initial state is loaded, all users present in the hrmData have their
      // connection status explicitly set to true. This ensures that the UI correctly
      // reflects their status.
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
      // Create a new state array by merging existing and new data
      // The previous logic used a Set of incoming client IDs to determine who was connected,
      // but this was flawed. By using the payload as the single source of truth, we ensure
      // that only users who are actively sending data are marked as connected.
      const mergedHrmData = state.hrmData.map((existingUser) => {
        const updatedUser = payload.find(
          (newUser) => newUser.clientId === existingUser.clientId
        )
        if (updatedUser) {
          // CRITICAL FIX: The order of spread operators is essential.
          // By spreading existingUser first, then updatedUser, we ensure
          // that any fields NOT present in the (potentially partial) `updatedUser`
          // payload are preserved from the existing state.
          return {
            ...existingUser,
            ...updatedUser,
            isConnected: true,
          }
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

export const WebSocketProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode
  serverUrl?: string
}) => {
  const [clientId] = useState(() => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      let id = localStorage.getItem('clientId')
      if (!id) {
        id = window.crypto.randomUUID()
        localStorage.setItem('clientId', id)
      }
      return id
    } catch (error) {
      console.error('Failed to access localStorage for clientId:', error)
      // Fallback to a non-persistent, in-memory UUID if localStorage is unavailable
      return window.crypto.randomUUID()
    }
  })

  // Memoize the WebSocket URL to prevent re-computation on every render
  const wsUrl = useMemo(() => {
    const url = serverUrl || getWebSocketURL()
    if (!clientId) return url // Return base URL if clientId isn't generated yet (SSR)

    try {
      const urlObject = new URL(url)
      urlObject.searchParams.set('clientId', clientId)
      return urlObject.toString()
    } catch (_error) {
      console.error('Invalid WebSocket URL:', url)
      return url // Fallback to the original URL on error
    }
  }, [serverUrl, clientId])

  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const pendingActions = useRef<ClientCommandMessage[]>([])
  // Refs for heartbeat mechanism
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration for exponential backoff
  const MAX_RECONNECT_ATTEMPTS = 10
  // The initial delay for the first reconnection attempt.
  const INITIAL_RECONNECT_DELAY = 1000 // 1 second
  // The factor by which the reconnection delay is randomized to prevent clients from reconnecting simultaneously.
  const JITTER_FACTOR = 0.2 // 20% jitter

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
      try {
        const savedActions = localStorage.getItem('pendingActions')
        if (savedActions) {
          pendingActions.current = JSON.parse(savedActions)
        }
      } catch (error) {
        console.error('Failed to retrieve pending actions from localStorage:', error)
        // Clear potentially corrupted data
        localStorage.removeItem('pendingActions')
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

        // The pong timeout is set to 15 seconds. This is a tripling of the
        // original 5-second timeout and provides a more generous buffer for
        // temporary network latency or server-side processing delays. This value
        // was chosen to be significantly longer than a typical network round-trip
        // time, but not so long that a genuinely stale connection would persist
        // for an excessive period.
        pongTimeoutRef.current = setTimeout(() => {
          console.warn(
            '[WebSocketProvider] Pong not received in time. Connection may be stale. Forcing reconnect.'
          )
          wsRef.current?.close() // Triggers the onclose reconnect logic
        }, 15000)
      }
    }, 30000)
  }, [stopHeartbeat])

  const connect = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      !wsUrl // Do not connect if the URL is not ready
    ) {
      return
    }

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      // Set test flag for Playwright tests
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
        try {
          localStorage.setItem('pendingActions', '[]')
        } catch (error) {
          console.error('Failed to clear pending actions in localStorage:', error)
        }
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

      // To prevent the UI from flashing stale data from a previous session on
      // reconnect, we dispatch a RESET_STATE action. This clears all
      // session-specific data and ensures the UI starts clean.
      dispatch({ type: 'RESET_STATE' })

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

        // Handle EXECUTE_SPOTIFY messages specially
        if (message.type === 'EXECUTE_SPOTIFY') {
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
    stopHeartbeat()
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
    console.log('[useWebSocket] Manually disconnected.')
  }, [stopHeartbeat])

  useEffect(() => {
    connectRef.current = connect
    try {
        connect()
    } catch (error) {
        console.error("Failed to initiate WebSocket connection:", error)
        setConnectionStatus("Error")
    }

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
      try {
        localStorage.setItem(
          'pendingActions',
          JSON.stringify(pendingActions.current)
        )
      } catch (error) {
        console.error('Failed to save pending actions to localStorage:', error)
      }
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
