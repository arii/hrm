import React, { useState, useEffect, useCallback } from 'react'
import { WebSocketContext, WebSocketContextType } from '@/context/WebSocketContext'
import {
  ServerMessage,
  ClientCommandMessage,
  HrmData,
  ActiveAlert,
  SpotifyDevice,
} from '@/types/websocket'
import { action } from '@storybook/addon-actions'

// Default empty state matching your AppState interface
const DEFAULT_STATE = {
  hrmData: [] as HrmData[],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE' as const,
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA' as const,
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackName: 'Storybook Simulation',
    artist: 'Mock Artist',
    isPlaying: false,
    devices: [] as SpotifyDevice[],
  },
  activeAlerts: [] as ActiveAlert[],
  spotifyServiceInitialized: true,
}

interface MockProviderProps {
  children: React.ReactNode
  /**
   * An array of server messages to "replay" in a loop.
   * Useful for simulating race conditions or specific sequences.
   */
  scenario?: ServerMessage[]
  /**
   * The speed at which the scenario plays (ms between frames).
   * Defaults to 1000ms (1 second).
   */
  interval?: number
  /**
   * Overrides for the initial static state.
   */
  initialState?: Partial<typeof DEFAULT_STATE>
}

export const MockWebSocketProvider = ({
  children,
  scenario = [],
  interval = 1000,
  initialState = {},
}: MockProviderProps) => {
  // 1. Initialize State
  const [state, setState] = useState({ ...DEFAULT_STATE, ...initialState })
  const [connectionStatus, setConnectionStatus] = useState('Connected')

  // 2. Scenario Engine
  useEffect(() => {
    if (!scenario || scenario.length === 0) return

    let frameIndex = 0
    const timerId = setInterval(() => {
      const message = scenario[frameIndex]

      // Update state based on the message type
      if (message) {
        setState((prev) => {
          switch (message.type) {
            case 'HRM_UPDATE':
              return { ...prev, hrmData: message.payload }
            case 'TIMER_UPDATE':
              return { ...prev, timerData: message.payload }
            case 'SPOTIFY_UPDATE':
              return { ...prev, spotifyData: message.payload }
            case 'ACTIVE_ALERTS_UPDATE':
              return { ...prev, activeAlerts: message.payload }
            case 'INITIAL_STATE':
               return { ...prev, ...message.payload }
            default:
              return prev
          }
        })
      }

      // Loop the scenario
      frameIndex = (frameIndex + 1) % scenario.length
    }, interval)

    return () => clearInterval(timerId)
  }, [scenario, interval])

  // 3. Mock Actions (Log to Storybook Actions panel)
  const sendData = useCallback((data: ClientCommandMessage) => {
    action('WebSocket Sent')(data)

    // Optional: Auto-respond to specific commands if needed
    if (data.type === 'TIMER_COMMAND' && data.command === 'START') {
        setState(prev => ({ ...prev, timerData: { ...prev.timerData, isRunning: true }}))
    }
  }, [])

  const connect = useCallback(() => {
    setConnectionStatus('Connected')
    action('WebSocket')('Connect called')
  }, [])

  const disconnect = useCallback(() => {
    setConnectionStatus('Disconnected')
    action('WebSocket')('Disconnect called')
  }, [])

  // 4. Construct Context
  const contextValue: WebSocketContextType = {
    ...state,
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
