import { WebSocketContextType, HrmData } from '@/context/WebSocketContext'
import { SpotifyData, TimerData } from '@/types/websocket'

export const mockSpotifyData: SpotifyData = {
  trackName: 'Test Track',
  artistName: 'Test Artist',
  albumArtUrl:
    'https://i.scdn.co/image/ab67616d0000b273f8e7a4a8c2d1b7a6f7d1b7a6',
  isPlaying: true,
  durationMs: 0,
  progressMs: 0,
  volumePercent: 50,
  devices: [],
}

export const mockSpotifyDataNoActivePlayback: SpotifyData = {
  trackName: 'Awaiting Login...',
  artistName: '',
  albumArtUrl: '',
  isPlaying: false,
  durationMs: 0,
  progressMs: 0,
  volumePercent: 70,
  devices: [],
}

export const mockTimerData: TimerData = {
  phase: 'WORK',
  timeRemaining: 20,
  isRunning: true,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  cycle: 0,
  totalCycles: 0,
  soundEventId: 0,
  timeElapsed: 0,
}

export const mockHrmData: HrmData = {
  clientId: '12345',
  value: 120,
  maxHr: 195,
  name: 'Test HRM',
  age: 30,
  calories: 100,
  isConnected: true,
  gender: 'MALE',
}

export const mockWebSocketContext: WebSocketContextType = {
  connectionStatus: 'Connected',
  timerData: mockTimerData,
  spotifyData: mockSpotifyData,
  hrmData: [mockHrmData],
  activeAlerts: [],
  spotifyServiceInitialized: true,
  sendData: () => {},
  disconnect: () => {},
  connect: () => {},
}
