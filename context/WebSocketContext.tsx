<<<<<<< HEAD:contexts/WebSocketContext.tsx
// File: contexts/WebSocketContext.tsx
'use client'
import { getWebSocketURL } from '@/utils/urls'
import React, {
  createContext,
=======
'use client'
import {
  createContext,
  ReactNode,
>>>>>>> origin/leader:context/WebSocketContext.tsx
  useCallback,
  useContext,
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
<<<<<<< HEAD:contexts/WebSocketContext.tsx
=======
import { getWebSocketURL } from '../utils/urls'
>>>>>>> origin/leader:context/WebSocketContext.tsx

interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
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
  spotifyData: { trackName: 'Awaiting Login...', artist: '', isPlaying: false },
  spotifyServiceInitialized: true,
}

<<<<<<< HEAD:contexts/WebSocketContext.tsx
interface WebSocketContextType {
  state: AppState
=======
interface WebSocketContextType extends AppState {
>>>>>>> origin/leader:context/WebSocketContext.tsx
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

<<<<<<< HEAD:contexts/WebSocketContext.tsx
export const WebSocketProvider: React.FC<{
  children: React.ReactNode
  serverUrl?: string
}> = ({ children, serverUrl }) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnect = useRef(true)
<<<<<<< HEAD:contexts/WebSocketContext.tsx

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
=======

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

<<<<<<< HEAD:contexts/WebSocketContext.tsx
    ws.onclose = () => {
      console.log('[WebSocketProvider] Disconnected from server')
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current) {
=======
    ws.onclose = (event) => {
      console.log(
        '[WebSocketProvider] Disconnected from server',
        event.code,
        event.reason
      )
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current && !reconnectTimeoutRef.current) {
>>>>>>> origin/leader:context/WebSocketContext.tsx
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocketProvider] Attempting to reconnect...')
          setConnectionStatus('Reconnecting...')
          connect()
        }, 3000)
      }
    }

<<<<<<< HEAD:contexts/WebSocketContext.tsx
    ws.onerror = () => {
=======
    ws.onerror = (_err) => {
>>>>>>> origin/leader:context/WebSocketContext.tsx
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

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    console.log('[WebSocketProvider] Manually disconnected.')
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const sendData = useCallback((data: ClientCommandMessage) => {
<<<<<<< HEAD:contexts/WebSocketContext.tsx
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open. State:',
        wsRef.current?.readyState
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
      )
      pendingActions.current.push(data)
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions.current))
    }
  }, [])

<<<<<<< HEAD:contexts/WebSocketContext.tsx
  const value = {
    state: appState,
=======
  const contextValue = {
    ...appState,
>>>>>>> origin/leader:context/WebSocketContext.tsx
    connectionStatus,
    sendData,
    connect,
    disconnect,
  }

  return (
<<<<<<< HEAD:contexts/WebSocketContext.tsx
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = <T,>(
  selector: (state: AppState) => T
): T => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    )
  }
  return selector(context.state)
}

export const useWebSocketActions = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error(
      'useWebSocketActions must be used within a WebSocketProvider'
    )
  }
  return {
    sendData: context.sendData,
    connect: context.connect,
    disconnect: context.disconnect,
    connectionStatus: context.connectionStatus,
  }
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
}
