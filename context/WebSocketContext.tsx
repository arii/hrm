<<<<<<< HEAD:contexts/WebSocketContext.tsx
// File: contexts/WebSocketContext.tsx
'use client'
import React, {
  createContext,
  useCallback,
=======
'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
>>>>>>> origin/leader:context/WebSocketContext.tsx
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  UnifiedStateMessage,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

// Define the shape of our application's state
interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

<<<<<<< HEAD:contexts/WebSocketContext.tsx
// Initial state for each context, ensuring proper typing
=======
>>>>>>> origin/leader:context/WebSocketContext.tsx
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
  spotifyData: { trackName: 'Awaiting Login...', artist: '', isPlaying: false },
  spotifyServiceInitialized: true,
}

<<<<<<< HEAD:contexts/WebSocketContext.tsx
// Create separate contexts for each slice of the state
export const TimerContext = createContext<TimerData>(INITIAL_STATE.timerData)
export const HrmContext = createContext<HrmData[]>(INITIAL_STATE.hrmData)
export const SpotifyContext = createContext<SpotifyData>(
  INITIAL_STATE.spotifyData
)

// Create a context for WebSocket actions (sendData, connect, disconnect)
interface WebSocketActions {
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
  connectionStatus: string
}

export const WebSocketActionsContext = createContext<WebSocketActions>({
  sendData: () => console.warn('WebSocket not initialized'),
  connect: () => console.warn('WebSocket not initialized'),
  disconnect: () => console.warn('WebSocket not initialized'),
  connectionStatus: 'Disconnected',
})

// The provider component that will wrap our application
export const WebSocketProvider: React.FC<{
  children: React.ReactNode
  serverUrl?: string
}> = ({ children, serverUrl }) => {
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingActions = useRef<ClientCommandMessage[]>([])

  // Unified state object managed by the provider
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)

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
    console.log('[WebSocketProvider] Manually disconnected.')
  }, [])

  const connect = useCallback(() => {
<<<<<<< HEAD:contexts/WebSocketContext.tsx
    if (typeof window === 'undefined') return
=======
    if (typeof window === 'undefined' || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
>>>>>>> origin/leader:context/WebSocketContext.tsx

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')
<<<<<<< HEAD:contexts/WebSocketContext.tsx
=======

      if (pendingActions.current.length > 0) {
        console.log(`[useWebSocket] Sending ${pendingActions.current.length} pending actions.`)
        pendingActions.current.forEach(action => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

      // Clear any pending reconnection
>>>>>>> origin/leader:context/WebSocketContext.tsx
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
        const message: UnifiedStateMessage = JSON.parse(event.data)
        if (message.type === 'STATE_UPDATE') {
          setAppState((prev) => ({
            hrmData: message.hrmData || prev.hrmData,
            timerData: message.timerData || prev.timerData,
            spotifyData: message.spotifyData || prev.spotifyData,
            spotifyServiceInitialized:
              message.spotifyServiceInitialized ?? prev.spotifyServiceInitialized,
          }))
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
  }, [wsUrl])

  useEffect(() => {
    connect()

    return () => {
<<<<<<< HEAD:contexts/WebSocketContext.tsx
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
=======
      disconnect()
>>>>>>> origin/leader:context/WebSocketContext.tsx
    }
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
<<<<<<< HEAD:contexts/WebSocketContext.tsx
      ws.send(JSON.stringify(data))
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open. State:',
        ws?.readyState
=======
      const jsonStr = JSON.stringify(data)
      console.log('[WebSocketProvider] Sending:', data)
      ws.send(jsonStr)
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open, queueing action. State:',
        ws?.readyState,
        'Data:',
        data
>>>>>>> origin/leader:context/WebSocketContext.tsx
      )
      pendingActions.current.push(data)
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions.current))
    }
  }, [])

<<<<<<< HEAD:contexts/WebSocketContext.tsx
  return (
    <WebSocketActionsContext.Provider
      value={{ sendData, connect, disconnect, connectionStatus }}
    >
      <TimerContext.Provider value={appState.timerData}>
        <HrmContext.Provider value={appState.hrmData}>
          <SpotifyContext.Provider value={appState.spotifyData}>
            {children}
          </SpotifyContext.Provider>
        </HrmContext.Provider>
      </TimerContext.Provider>
    </WebSocketActionsContext.Provider>
  )
}
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
