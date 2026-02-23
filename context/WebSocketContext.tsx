'use client'
import throttle from 'lodash.throttle'
import logger from '@/utils/logger'
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
import { getWebSocketURL } from '../utils/urls'

import { INITIAL_STATE, WebSocketState, reducer } from './webSocketReducer'
import { ConnectedHrmData as HrmData } from '../types/websocket'

export type { HrmData }

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
      logger.error('Failed to access localStorage', error)
      return window.crypto.randomUUID() // Fallback to in-memory UUID
    }
  })

  // Memoize the WebSocket URL to prevent re-computation on every render
  const wsUrl = useMemo(() => {
    const url = serverUrl || getWebSocketURL()
    if (!clientId) return null // Return null if clientId isn't generated yet

    try {
      const urlObject = new URL(url)
      urlObject.searchParams.set('clientId', clientId)
      return urlObject.toString()
    } catch (_error) {
      logger.error('Invalid WebSocket URL', { url, error: _error })
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
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }

    }
  }, [])

  // Throttled warning for connection issues
  const throttledConnectionWarning = useMemo(
    () =>
      throttle(
        () => {
          logger.warn(
            '[WebSocketProvider] Connection not open. Queuing action.'
          )
        },
        5000, // Prevent log spam by throttling to once every 5 seconds
        { leading: true, trailing: false } // Important: issue the warning on the first failed attempt
      ),
    []
  )

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
          logger.warn(
            '[WebSocketProvider] Pong not received in time. Forcing reconnect.'
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
      logger.info('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      // Set test flag for Playwright tests - use a more reliable method
      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true
        document.body.dataset.connectionStatus = 'connected'
      }

      // Explicitly request initial state from the server
      ws.send(JSON.stringify({ type: 'GET_STATE' }))

      if (pendingActions.current.length > 0) {
        logger.info(
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
      logger.info(
        `[WebSocketProvider] Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`
      )
      setConnectionStatus('Disconnected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = false
        document.body.dataset.connectionStatus = 'disconnected'
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

          logger.info(
            `[WebSocketProvider] Reconnection attempt ${reconnectAttempts.current} in ${reconnectDelay.toFixed(0)}ms`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('Reconnecting...')
            connectRef.current()
          }, reconnectDelay)
        } else {
          logger.error('[WebSocketProvider] Max reconnection attempts reached.')
          setConnectionStatus(
            'Failed to connect. Please check your connection and refresh the page.'
          )
        }
      }
    }

    ws.onerror = (err) => {
      logger.warn('[WebSocketProvider] Connection error', err)
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

        // Throttle high-frequency messages
        if (message.type === 'HRM_UPDATE' || message.type === 'TIMER_UPDATE') {
          throttledDispatch(message)
        } else {
          // Dispatch critical messages immediately
          dispatch(message)
        }
      } catch (e) {
        logger.error('Failed to parse WebSocket message', {
          error: e,
          data: event.data,
        })
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
    logger.info('[useWebSocket] Manually disconnected.')
  }, [stopHeartbeat])

  useEffect(() => {
    connectRef.current = connect
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Centralized effect for exposing test controls to the window object.
  // This ensures that all required controls (dispatch, connect, disconnect)
  // are attached consistently and updated whenever their implementations change.
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV !== 'production' ||
        process.env.NEXT_PUBLIC_TESTING === 'true' ||
        window.location.search.includes('testing=true'))
    ) {
      window.__TEST_CONTROLS__ = {
        ...window.__TEST_CONTROLS__,
        dispatch,
        connect,
        disconnect,
      }
    }
  }, [dispatch, connect, disconnect])

  const sendData = useCallback(
    (data: ClientCommandMessage) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const jsonStr = JSON.stringify(data)
        ws.send(jsonStr)
      } else {
        throttledConnectionWarning() // Use the throttled warning
        // Queue the action for when connection is restored
        pendingActions.current.push(data)
        localStorage.setItem(
          'pendingActions',
          JSON.stringify(pendingActions.current)
        )
      }
    },
    [throttledConnectionWarning]
  )

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
