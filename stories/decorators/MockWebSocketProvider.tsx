import { ReactNode } from 'react'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import { TimerPhase } from '@/types/websocket'

const defaultState: WebSocketContextType = {
  activeAlerts: [],
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE' as TimerPhase,
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA',
    workDuration: 20,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackName: 'No Track Playing',
    artist: '',
    isPlaying: false,
    devices: [],
  },
  spotifyServiceInitialized: true,
  connectionStatus: 'Connected',
  sendData: (data) => console.log('Mock sendData:', data),
  connect: () => console.log('Mock connect'),
  disconnect: () => console.log('Mock disconnect'),
}

interface MockWebSocketProviderProps {
  children: ReactNode
  values?: Partial<WebSocketContextType>
}

export const MockWebSocketProvider = ({
  children,
  values,
}: MockWebSocketProviderProps) => {
  const mergedState = { ...defaultState, ...values }

  // Ensure deep merge for nested objects if needed, but simple spread works for top level.
  // For nested like timerData, we might need manual merge if values has partial timerData.
  if (values?.timerData) {
    mergedState.timerData = { ...defaultState.timerData, ...values.timerData }
  }
  if (values?.spotifyData) {
    mergedState.spotifyData = {
      ...defaultState.spotifyData,
      ...values.spotifyData,
    }
  }

  return (
    <WebSocketContext.Provider value={mergedState}>
      {children}
    </WebSocketContext.Provider>
  )
}
