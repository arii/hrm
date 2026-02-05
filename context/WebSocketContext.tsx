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
import {
  ClientCommandMessage,
  ServerMessage,
  HrmData,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

interface TestControls {
  dispatch: (message: ServerMessage) => void
  disconnect: () => void
  connect: () => void
}
import { INITIAL_STATE, WebSocketState, reducer } from './webSocketReducer'

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

  const wsUrl = useMemo(() => {
    const url = serverUrl || getWebSocketURL()
    if (!clientId) return null

    try {
      const urlObject = new URL(url)
      urlObject.searchParams.set('clientId', clientId)
      return urlObject.toString()
    } catch (_error) {
      logger.error('Invalid WebSocket URL', { url, error: _error })
      return url
    }
  }, [serverUrl, clientId])

  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const pendingActions = useRef<ClientCommandMessage[]>([])
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_RECONNECT_ATTEMPTS = 10
  const INITIAL_RECONNECT_DELAY = 1000
  const JITTER_FACTOR = 0.2

  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)

  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => {
      dispatch(message)
    }, 100)
  ).current

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedActions = localStorage.getItem('pendingActions')
    if (savedActions) {
      pendingActions.current = JSON.parse(savedActions)
    }

    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_TESTING === 'true'
    ) {
      ;(
        window as Window & { __TEST_CONTROLS__?: TestControls }
      ).__TEST_CONTROLS__ = {
        dispatch,
        disconnect: () => {},
        connect: () => {},
      }

      const handleMessage = (event: MessageEvent) => {
        const data = event.data
        if (typeof data === 'object' && data !== null && 'type' in data) {
          const message = data as { type: unknown }
          if (
            typeof message.type === 'string' &&
            (message.type === 'HRM_UPDATE' ||
              message.type === 'TIMER_UPDATE' ||
              message.type === 'DEVICE_OFFLINE')
          ) {
            dispatch(data as ServerMessage)
          }
        }
      }

      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }
    return undefined
  }, [dispatch])

  const throttledConnectionWarning = useMemo(
    () =>
      throttle(
        () => {
          logger.warn(
            '[WebSocketProvider] Connection not open. Queuing action.'
          )
        },
        5000,
        { leading: true, trailing: false }
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
    stopHeartbeat()

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }))

        // 15s provides ample buffer for network latency (3x standard RTT) before forcing reconnect
        pongTimeoutRef.current = setTimeout(() => {
          logger.warn(
            '[WebSocketProvider] Pong not received in time. Forcing reconnect.'
          )
          wsRef.current?.close()
        }, 15000)
      }
    }, 30000)
  }, [stopHeartbeat])

  const connect = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      !wsUrl
    ) {
      return
    }

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      logger.info('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (typeof window !== 'undefined') {
        window.__TEST_WEBSOCKET_READY__ = true
      }

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

      reconnectAttempts.current = 0

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      startHeartbeat()
    }

    ws.onclose = (event) => {
      logger.info(
        `[WebSocketProvider] Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`
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
        logger.error('Failed to parse WebSocket message', {
          error: e,
          data: event.data,
        })
      }
    }
  }, [wsUrl, throttledDispatch, startHeartbeat, stopHeartbeat])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
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

    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const testControls = (
        window as Window & { __TEST_CONTROLS__?: TestControls }
      ).__TEST_CONTROLS__
      if (testControls) {
        testControls.disconnect = disconnect
        testControls.connect = connect
      }
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const sendData = useCallback(
    (data: ClientCommandMessage) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        const jsonStr = JSON.stringify(data)
        ws.send(jsonStr)
      } else {
        throttledConnectionWarning()
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
