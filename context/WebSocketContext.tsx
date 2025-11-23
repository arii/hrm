<<<<<<< HEAD:context/WebSocketContext.tsx
'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
=======
// File: hooks/useWebSocket.ts (Central WebSocket Client Hook - Typed)
/**
 * Central client-side hook for managing WebSocket connection and application state.
 * It establishes the connection and updates state based on topic-based server broadcasts.
 */
import { useCallback, useEffect, useRef, useState, useReducer } from 'react'
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts
import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  ServerBroadcastMessage,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized: boolean
}

<<<<<<< HEAD:context/WebSocketContext.tsx
const INITIAL_STATE: AppState = {
=======
// --- State Management ---

type StateAction =
  | { type: 'SET_INITIAL_STATE'; payload: AppState }
  | { type: 'UPDATE_HRM'; payload: HrmData[] }
  | { type: 'UPDATE_TIMER'; payload: TimerData }
  | { type: 'UPDATE_SPOTIFY'; payload: SpotifyData }

const initialState: AppState = {
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts
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
  spotifyData: { trackName: 'Awaiting Login...', artist: '', isPlaying: false },
  spotifyServiceInitialized: true,
}

<<<<<<< HEAD:context/WebSocketContext.tsx
interface WebSocketContextType extends AppState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

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
  const pendingActions = useRef<ClientCommandMessage[]>([])

  // Unified State Object
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)
=======
const appStateReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'SET_INITIAL_STATE':
      return action.payload
    case 'UPDATE_HRM':
      return { ...state, hrmData: action.payload }
    case 'UPDATE_TIMER':
      return { ...state, timerData: action.payload }
    case 'UPDATE_SPOTIFY':
      return { ...state, spotifyData: action.payload }
    default:
      return state
  }
}

const useWebSocket = (serverUrl?: string) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [appState, dispatch] = useReducer(appStateReducer, initialState)
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
    console.log('[useWebSocket] Manually disconnected.')
  }, [])

  const connect = useCallback(() => {
<<<<<<< HEAD:context/WebSocketContext.tsx
    if (typeof window === 'undefined' || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
=======
    if (typeof window === 'undefined') return
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')

      if (pendingActions.current.length > 0) {
        console.log(`[useWebSocket] Sending ${pendingActions.current.length} pending actions.`)
        pendingActions.current.forEach(action => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log(
        '[WebSocketProvider] Disconnected from server',
        event.code,
        event.reason
      )
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocketProvider] Attempting to reconnect...')
          setConnectionStatus('Reconnecting...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = (_err) => {
      console.warn('[WebSocketProvider] Connection error')
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      try {
<<<<<<< HEAD:context/WebSocketContext.tsx
        const message: UnifiedStateMessage = JSON.parse(event.data)
        if (message.type === 'STATE_UPDATE') {
          setAppState((prev) => ({
            hrmData: message.hrmData || prev.hrmData,
            timerData: message.timerData || prev.timerData,
            spotifyData: message.spotifyData || prev.spotifyData,
            spotifyServiceInitialized:
              message.spotifyServiceInitialized ?? prev.spotifyServiceInitialized,
          }))
=======
        const message: ServerBroadcastMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'INITIAL_STATE':
            dispatch({ type: 'SET_INITIAL_STATE', payload: message.payload })
            break
          case 'HRM_UPDATE':
            dispatch({ type: 'UPDATE_HRM', payload: message.payload })
            break
          case 'TIMER_UPDATE':
            dispatch({ type: 'UPDATE_TIMER', payload: message.payload })
            break
          case 'SPOTIFY_UPDATE':
            dispatch({ type: 'UPDATE_SPOTIFY', payload: message.payload })
            break
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl])

  useEffect(() => {
    connect()

    return () => {
<<<<<<< HEAD:context/WebSocketContext.tsx
      disconnect()
=======
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts
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
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions.current))
    }
  }, [])

<<<<<<< HEAD:context/WebSocketContext.tsx
  const contextValue = {
=======
  return {
>>>>>>> feat: Optimize WebSocket broadcasting with topic-based messages:hooks/useWebSocket.ts
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
