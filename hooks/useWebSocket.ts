<<<<<<< HEAD:hooks/useWebSocket.ts
// File: hooks/useWebSocket.ts (Central WebSocket Client Hook - Typed)
/**
 * Central client-side hook for managing WebSocket connection and application state.
 * It establishes the connection and updates the unified state based on server broadcasts.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
=======
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
>>>>>>> origin/leader:context/WebSocketContext.tsx
import {
  ClientCommandMessage,
  HrmData,
  SpotifyData,
  TimerData,
  UnifiedStateMessage,
} from '../types/websocket'

import { getWebSocketURL } from '../utils/urls'

interface AppState {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

// Initial state, conforming to the interfaces
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

const useWebSocket = (serverUrl?: string) => {
  const wsUrl = serverUrl || getWebSocketURL()
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
<<<<<<< HEAD:hooks/useWebSocket.ts
=======
  const pendingActions = useRef<ClientCommandMessage[]>([])
>>>>>>> origin/leader:context/WebSocketContext.tsx

  // Unified State Object
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)
  const connectRef = useRef<(() => void) | null>(null)

<<<<<<< HEAD:hooks/useWebSocket.ts
=======
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActions = localStorage.getItem('pendingActions')
      if (savedActions) {
        pendingActions.current = JSON.parse(savedActions)
      }
    }
  }, [])

>>>>>>> origin/leader:context/WebSocketContext.tsx
  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
<<<<<<< HEAD:hooks/useWebSocket.ts
=======
    }
    console.log('[useWebSocket] Manually disconnected.')
  }, [])

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || wsRef.current?.readyState === WebSocket.OPEN) {
      return
>>>>>>> origin/leader:context/WebSocketContext.tsx
    }
    console.log('[useWebSocket] Manually disconnected.')
  }, [])

  const connect = useCallback(() => {
    // Ensure this runs only client-side
    if (typeof window === 'undefined') return

    shouldReconnect.current = true
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[useWebSocket] Connected to server')
      setConnectionStatus('Connected')
<<<<<<< HEAD:hooks/useWebSocket.ts
=======

      if (pendingActions.current.length > 0) {
        console.log(`[useWebSocket] Sending ${pendingActions.current.length} pending actions.`)
        pendingActions.current.forEach(action => {
          ws.send(JSON.stringify(action))
        })
        pendingActions.current = []
        localStorage.setItem('pendingActions', '[]')
      }

>>>>>>> origin/leader:context/WebSocketContext.tsx
      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log(
        '[useWebSocket] Disconnected from server',
        event.code,
        event.reason
      )
      setConnectionStatus('Disconnected')

      // Attempt to reconnect after 3 seconds, if not explicitly disconnected
      if (shouldReconnect.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useWebSocket] Attempting to reconnect...')
          setConnectionStatus('Reconnecting...')
          connectRef.current?.()
        }, 3000)
      }
    }

    ws.onerror = (_err) => {
      console.warn('[useWebSocket] Connection error')
      setConnectionStatus('Error')
    }

    ws.onmessage = (event) => {
      try {
        // Assert incoming message is the UnifiedStateMessage type
        const message: UnifiedStateMessage = JSON.parse(event.data)

        if (message.type === 'STATE_UPDATE') {
          if (message.hrmData !== undefined) {
            console.log(
              '[useWebSocket] Received STATE_UPDATE. HRM Data:',
              message.hrmData
            )
          }
          // Merge the incoming state with the current state to preserve non-updated fields
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

  useEffect(() => {
    connectRef.current = connect
    connect()

    return () => {
      // Clean up the connection and reconnection timeout on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  /**
   * Sends a JSON payload (ClientCommandMessage) to the WebSocket server.
   * Note: The hook takes the typed object and stringifies it internally.
   */
  const sendData = useCallback((data: ClientCommandMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      const jsonStr = JSON.stringify(data)
      console.log('[useWebSocket] Sending:', data)
      ws.send(jsonStr)
    } else {
      console.warn(
<<<<<<< HEAD:hooks/useWebSocket.ts
        '[useWebSocket] WebSocket not open. State:',
=======
        '[WebSocketProvider] WebSocket not open, queueing action. State:',
>>>>>>> origin/leader:context/WebSocketContext.tsx
        ws?.readyState,
        'Data:',
        data
      )
      pendingActions.current.push(data)
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions.current))
    }
  }, [])

  return {
    ...appState, // Expose all state parts directly
    connectionStatus,
    sendData,
    connect,
    disconnect,
  }
}

export default useWebSocket
