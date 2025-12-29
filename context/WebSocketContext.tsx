'use client'
import throttle from 'lodash.throttle'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useReducer,
  useRef,
} from 'react'
import { ClientCommandMessage, ServerMessage } from '../types/websocket'
import { HrmStreamData as ServerHrmData } from '../types/core'
import { INITIAL_STATE, WebSocketState } from './webSocketReducer'
import webSocketManager from '../services/WebSocketManager'

// Client-side extension of HrmData to include connection status
export interface HrmData extends ServerHrmData {
  isConnected: boolean
}

export interface WebSocketContextType extends WebSocketState {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

// Unified State Object managed by a reducer
export const reducer = (
  state: WebSocketState,
  message: ServerMessage | { type: 'RESET_STATE' }
): WebSocketState => {
  switch (message.type) {
    case 'RESET_STATE':
      return INITIAL_STATE
    case 'INITIAL_STATE': {
      // When the initial state is loaded, all users present in the hrmData have their
      // connection status explicitly set to true. This ensures that the UI correctly
      // reflects their status.
      const hrmDataWithConnection =
        message.payload.hrmData?.map((d) => ({ ...d, isConnected: true })) || []
      return {
        ...state,
        ...message.payload,
        hrmData: hrmDataWithConnection,
      }
    }
    case 'HRM_UPDATE': {
      const payload = message.payload as ServerHrmData[]
      // Create a new state array by merging existing and new data
      // The previous logic used a Set of incoming client IDs to determine who was connected,
      // but this was flawed. By using the payload as the single source of truth, we ensure
      // that only users who are actively sending data are marked as connected.
      const mergedHrmData = state.hrmData.map((existingUser) => {
        const updatedUser = payload.find(
          (newUser) => newUser.clientId === existingUser.clientId
        )
        if (updatedUser) {
          // CRITICAL FIX: The order of spread operators is essential.
          // By spreading existingUser first, then updatedUser, we ensure
          // that any fields NOT present in the (potentially partial) `updatedUser`
          // payload are preserved from the existing state.
          return {
            ...existingUser,
            ...updatedUser,
            isConnected: true,
          }
        }
        return { ...existingUser, isConnected: false }
      })

      // Add any brand-new users from the payload who were not in the previous state
      payload.forEach((newUser) => {
        if (
          !state.hrmData.some(
            (existingUser) => existingUser.clientId === newUser.clientId
          )
        ) {
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
      // This message type is handled by useSpotifyRemoteExecution hook
      // We don't need to update state here, just pass it through
      return state
    default:
      return state
  }
}

export const WebSocketProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode
  serverUrl?: string
}) => {
  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [connectionStatus, setConnectionStatus] = useState(
    webSocketManager.getConnectionStatus()
  )

  useEffect(() => {
    webSocketManager.initialize(serverUrl);

    const throttledDispatch = throttle((message: ServerMessage) => {
      dispatch(message)
    }, 100)

    const handleMessage = (message: ServerMessage) => {
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
    }

    const handleStatusChange = (status: string) => {
      setConnectionStatus(status)
      if (status === 'Disconnected' || status === 'Failed to connect') {
        dispatch({ type: 'RESET_STATE' })
      }
    }

    webSocketManager.addMessageListener(handleMessage)
    webSocketManager.addStatusListener(handleStatusChange)

    return () => {
      webSocketManager.removeMessageListener(handleMessage)
      webSocketManager.removeStatusListener(handleStatusChange)
    }
  }, [serverUrl])

  const sendData = useCallback((data: ClientCommandMessage) => {
    webSocketManager.sendData(data)
  }, [])

  const contextValue = {
    ...appState,
    connectionStatus,
    sendData,
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
