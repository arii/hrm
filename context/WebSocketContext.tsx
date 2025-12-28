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
  useMemo,
} from 'react'
import { ClientCommandMessage, ServerMessage } from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'
import { getWebSocketURL } from '../utils/urls'
import { reducer, INITIAL_STATE, WebSocketState } from './webSocketReducer'

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
    let id = localStorage.getItem('clientId')
    if (!id) {
      id = window.crypto.randomUUID()
      localStorage.setItem('clientId', id)
    }
    return id
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
  const INITIAL_RECONNECT_DELAY = 1000 // 1 second
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
    console.log(`[WebSocketProvider] Connecting to ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true
      }

      ws.send(JSON.stringify({ type: 'GET_STATE' }))

      if (pendingActions.current.length > 0) {
        pendingActions.current.forEach((action) => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      reconnectAttempts.current = 0
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
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

      stopHeartbeat()
      dispatch({ type: 'RESET_STATE' })

      if (shouldReconnect.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          const delay =
            INITIAL_RECONNECT_DELAY * 2 ** (reconnectAttempts.current - 1)
          const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5)
          const reconnectDelay = delay + jitter

          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('Reconnecting...')
            connectRef.current()
          }, reconnectDelay)
        } else {
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

        if (message.type === 'PONG') {
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current)
          }
          return
        }

        if (message.type === 'EXECUTE_SPOTIFY') {
          window.dispatchEvent(
            new CustomEvent('spotify-remote-command', {
              detail: message,
            })
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
  }, [wsUrl, throttledDispatch, startHeartbeat, stopHeartbeat])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    stopHeartbeat()
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
  }, [stopHeartbeat])

  useEffect(() => {
    connectRef.current = connect
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const sendData = useCallback(
    (data: ClientCommandMessage) => {
      const ws = wsRef.current
      const augmentedData = { ...data, clientId }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(augmentedData))
      } else {
        pendingActions.current.push(augmentedData)
        localStorage.setItem(
          'pendingActions',
          JSON.stringify(pendingActions.current)
        )
      }
    },
    [clientId]
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
