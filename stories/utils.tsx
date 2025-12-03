import { ReactNode } from 'react'
import { WebSocketContext } from '../context/WebSocketContext'
import { TimerData, SpotifyData, ClientCommandMessage } from '../types/websocket'

export const defaultTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 0,
  timeElapsed: 0,
  mode: 'TABATA',
  workDuration: 30,
  restDuration: 10,
  soundEventId: 0,
}

export const defaultSpotifyData: SpotifyData = {
  trackName: 'Awaiting Login...',
  artist: '',
  isPlaying: false,
  devices: []
}

export const MockWebSocketProvider = ({
  children,
  connectionStatus = 'Connected',
  timerData = defaultTimerData,
  spotifyData = defaultSpotifyData,
  sendData = () => {},
}: {
  children: ReactNode
  connectionStatus?: string
  timerData?: TimerData
  spotifyData?: SpotifyData
  sendData?: (data: ClientCommandMessage) => void
}) => {
  return (
    <WebSocketContext.Provider
      value={{
        hrmData: [],
        timerData,
        spotifyData,
        spotifyServiceInitialized: true,
        connectionStatus,
        sendData,
        connect: () => {},
        disconnect: () => {},
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
