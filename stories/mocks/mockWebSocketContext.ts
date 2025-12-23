import { WebSocketContextType } from '@/context/WebSocketContext'
import { SpotifyData, TimerData } from '@/types/websocket'
import { HrmData } from '@/types'

export const mockSpotifyData: SpotifyData = {
  trackName: 'Test Track',
  artist: 'Test Artist',
  albumArt: 'https://i.scdn.co/image/ab67616d0000b273f8e7a4a8c2d1b7a6f7d1b7a6',
  isPlaying: true,
  progressMs: 60000,
  durationMs: 180000,
  volume: 50,
  isMuted: false,
}

export const mockTimerData: TimerData = {
  currentPhase: 'WORK',
  timeRemaining: 20,
  isRunning: true,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  totalRounds: 8,
  currentRound: 1,
  timeElapsed: 0,
}

export const mockHrmData: HrmData = {
  heartRate: 120,
  deviceName: 'Test HRM',
  deviceId: '12345',
}

export const mockWebSocketContext: WebSocketContextType = {
  connectionStatus: 'Connected',
  timerData: mockTimerData,
  spotifyData: mockSpotifyData,
  hrmData: mockHrmData,
  sendData: () => {},
  disconnect: () => {},
  lastMessage: null,
  error: null,
  clearError: () => {},
}
