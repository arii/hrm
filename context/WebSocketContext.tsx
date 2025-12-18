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
  SpotifyData,
  TimerData,
  ServerMessage,
  ActiveAlert,
} from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'
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
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration
  const MAX_RECONNECT_ATTEMPTS = 10
  const INITIAL_RECONNECT_DELAY = 1000 // 1 second
  const JITTER_FACTOR = 0.2 // 20% jitter
  const HEARTBEAT_INTERVAL = 30000 // 30 seconds
  const PONG_TIMEOUT = 5000 // 5 seconds

  // Unified State Object managed by a reducer
  const reducer = (
    state: WebSocketState,
    message: ServerMessage
  ): WebSocketState => {
    switch (message.type) {
      case 'INITIAL_STATE': {
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
        const incomingClients = new Set(payload.map((user) => user.clientId))
        const mergedHrmData = state.hrmData.map((existingUser) => ({
          ...existingUser,
          ...(payload.find((p) => p.clientId === existingUser.clientId) || {}),
          isConnected: incomingClients.has(existingUser.clientId),
        }))
        payload.forEach((newUser) => {
          if (!mergedHrmData.some((u) => u.clientId === newUser.clientId)) {
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
        return state
      default:
        return state
    }
  }

  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => dispatch(message), 100)
  ).current
  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)
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
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
    if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current)
  }, [])

  const startHeartbeat = useCallback(() => {
    stopHeartbeat() // Ensure no existing timers are running

    const heartbeat = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return

      wsRef.current.send(JSON.stringify({ type: 'PING' }))

      // Expect a pong within the timeout period
      pongTimeoutRef.current = setTimeout(() => {
        // Guard against acting on a closed or closing socket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.warn(
            '[WS] Pong not received. Connection stale. Reconnecting.'
          )
          wsRef.current?.close() // Triggers 'onclose' which handles reconnection
        }
      }, PONG_TIMEOUT)

      // Schedule the next heartbeat
      heartbeatTimerRef.current = setTimeout(heartbeat, HEARTBEAT_INTERVAL)
    }

    heartbeat() // Start the first heartbeat immediately
  }, [stopHeartbeat])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected to server')
      setConnectionStatus('Connected')
      if (typeof window !== 'undefined') window.__TEST_WEBSOCKET_READY__ = true
      ws.send(JSON.stringify({ type: 'GET_STATE' }))

      if (pendingActions.current.length > 0) {
        pendingActions.current.forEach((action) =>
          ws.send(JSON.stringify(action))
        )
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      reconnectAttempts.current = 0
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current)
      startHeartbeat()
    }

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason)
      setConnectionStatus('Disconnected')
      if (typeof window !== 'undefined') window.__TEST_WEBSOCKET_READY__ = false
      stopHeartbeat()

      if (shouldReconnect.current) {
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          const delay =
            INITIAL_RECONNECT_DELAY * 2 ** (reconnectAttempts.current - 1)
          const jitter = delay * JITTER_FACTOR * (Math.random() - 0.5)
          const reconnectDelay = delay + jitter
          console.log(
            `[WS] Reconnect attempt ${reconnectAttempts.current} in ${reconnectDelay.toFixed(0)}ms`
          )
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionStatus('Reconnecting...')
            connectRef.current()
          }, reconnectDelay)
        } else {
          console.error('[WS] Max reconnection attempts reached.')
          setConnectionStatus('Connection Failed. Please refresh.')
        }
      }
    }

    ws.onerror = () => {
      console.warn('[WS] Connection error')
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      const message: ServerMessage = JSON.parse(event.data)

      if (message.type === 'PONG') {
        if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current)
        return
      }

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
    }
  }, [wsUrl, throttledDispatch, startHeartbeat, stopHeartbeat])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    stopHeartbeat()
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    wsRef.current?.close()
    console.log('[WS] Manually disconnected.')
  }, [stopHeartbeat])

  useEffect(() => {
    connectRef.current = connect
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('[WS] Not open, queueing action:', data.type)
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
