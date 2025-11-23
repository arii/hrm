// File: contexts/WebSocketContext.tsx
'use client'
import { getWebSocketURL } from '@/utils/urls'
import React, {
  createContext,
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

interface WebSocketContextType {
  state: AppState
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const WebSocketProvider: React.FC<{
  children: React.ReactNode
  serverUrl?: string
}> = ({ children, serverUrl }) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnect = useRef(true)

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected to server')
      setConnectionStatus('Connected')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = () => {
      console.log('[WebSocketProvider] Disconnected from server')
      setConnectionStatus('Disconnected')
      if (shouldReconnect.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocketProvider] Attempting to reconnect...')
          setConnectionStatus('Reconnecting...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = () => {
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
              message.spotifyServiceInitialized ??
              prev.spotifyServiceInitialized,
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn(
        '[WebSocketProvider] WebSocket not open. State:',
        wsRef.current?.readyState
      )
    }
  }, [])

  const value = {
    state: appState,
    connectionStatus,
    sendData,
    connect,
    disconnect,
  }

  return (
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
}
