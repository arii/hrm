import { WebSocketContextType } from '@/context/WebSocketContext'
import { HrmData } from '@/types'
import { SpotifyData, TimerData } from '@/types/websocket'

export const mockSpotifyData: SpotifyData = {
  trackId: 'test-track-id',
  trackName: 'Test Track',
  artist: 'Test Artist',
  albumName: 'Test Album',
  albumArtUrl:
    'https://i.scdn.co/image/ab67616d0000b273f8e7a4a8c2d1b7a6f7d1b7a6',
  isPlaying: true,
  devices: [],
  volume: 50,
  isMuted: false,
}

export const mockSpotifyDataNoActivePlayback: SpotifyData = {
  trackId: null,
  trackName: 'Awaiting Login...',
  artist: '',
  albumName: '',
  albumArtUrl: '',
  isPlaying: false,
  devices: [],
  volume: 70,
  isMuted: false,
}

export const mockTimerData: TimerData = {
  currentPhase: 'WORK',
  timeRemaining: 20,
  isRunning: true,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  caloriesBurned: 0,
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
