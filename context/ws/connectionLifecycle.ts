'use client'
import throttle from 'lodash.throttle'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import logger from '@/utils/logger'
import type { ClientCommandMessage, ServerMessage } from '../../types/websocket'
import type { WebSocketDispatch } from './testHooks'
import { isTestEnvironment, markConnectionStatus } from './testHooks'
import {
  clearPendingActions,
  flushPendingActions,
  loadPendingActions,
  persistPendingActions,
} from './offlineQueue'

// Connection lifecycle for WebSocketProvider: dial, heartbeat, reconnect
// backoff, offline queueing, and the visibility/online recovery listeners.
// Behavior-preserving extraction — the callbacks and their sequencing are
// unchanged from the original provider body.

// Configuration for exponential backoff
const MAX_RECONNECT_ATTEMPTS = 10
// The initial delay for the first reconnection attempt.
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
// The factor by which the reconnection delay is randomized to prevent clients from reconnecting simultaneously.
const JITTER_FACTOR = 0.2 // 20% jitter

export interface ConnectionLifecycle {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

export const useWebSocketLifecycle = ({
  wsUrl,
  dispatch,
  throttledDispatch,
}: {
  wsUrl: string | null
  dispatch: WebSocketDispatch
  throttledDispatch: (message: ServerMessage) => void
}): ConnectionLifecycle => {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const pendingActions = useRef<ClientCommandMessage[]>([])
  // Refs for heartbeat mechanism
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  // Ref to hold the connect function, ensuring it's always up-to-date
  const connectRef = useRef<() => void>(() => {})

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
      if (ws !== wsRef.current) return
      logger.info('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      // Set test flag for Playwright tests - use a more reliable method
      markConnectionStatus('connected')

      // Explicitly request initial state from the server
      ws.send(JSON.stringify({ type: 'GET_STATE' }))

      if (pendingActions.current.length > 0) {
        logger.info(
          `[useWebSocket] Sending ${pendingActions.current.length} pending actions.`
        )
        pendingActions.current = flushPendingActions(ws, pendingActions.current)
        clearPendingActions()
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
      if (ws !== wsRef.current) return
      logger.info(
        `[WebSocketProvider] Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`
      )
      setConnectionStatus('Disconnected')

      markConnectionStatus('disconnected')

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
      if (ws !== wsRef.current) return
      logger.warn('[WebSocketProvider] Connection error', err)
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      if (ws !== wsRef.current) return
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
  }, [wsUrl, throttledDispatch, startHeartbeat, stopHeartbeat, dispatch])

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
    // Restore any commands queued while the socket was down before the
    // first dial replays them.
    pendingActions.current = loadPendingActions()

    connectRef.current = connect
    connect()

    if (isTestEnvironment()) {
      if (window.__TEST_CONTROLS__) {
        window.__TEST_CONTROLS__.disconnect = disconnect
        window.__TEST_CONTROLS__.connect = connect
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const ws = wsRef.current
        if (
          !ws ||
          ws.readyState === WebSocket.CLOSED ||
          ws.readyState === WebSocket.CLOSING
        ) {
          logger.info('[WebSocketProvider] Page visible again. Reconnecting...')
          connectRef.current()
        } else if (ws.readyState === WebSocket.OPEN) {
          // Send an immediate ping to verify the connection is still alive
          // after the device wakes up
          ws.send(JSON.stringify({ type: 'PING' }))
        }
      }
    }

    const handleOnline = () => {
      logger.info(
        '[WebSocketProvider] Browser came online. Checking connection...'
      )
      const ws = wsRef.current
      if (
        !ws ||
        ws.readyState === WebSocket.CLOSED ||
        ws.readyState === WebSocket.CLOSING
      ) {
        connectRef.current()
      }
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('online', handleOnline)
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('online', handleOnline)
        if (window.__TEST_CONTROLS__) {
          if (window.__TEST_CONTROLS__.disconnect === disconnect) {
            delete window.__TEST_CONTROLS__.disconnect
          }
          if (window.__TEST_CONTROLS__.connect === connect) {
            delete window.__TEST_CONTROLS__.connect
          }
        }
      }
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
        throttledConnectionWarning() // Use the throttled warning
        // Queue the action for when connection is restored
        pendingActions.current.push(data)
        persistPendingActions(pendingActions.current)
      }
    },
    [throttledConnectionWarning]
  )

  return { connectionStatus, sendData, connect, disconnect }
}
