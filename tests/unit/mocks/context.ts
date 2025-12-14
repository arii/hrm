import { jest } from '@jest/globals'

export const mockSpotifyData = {
  trackName: 'Test Track',
  artist: 'Test Artist',
  isPlaying: false,
  progressMs: 50000,
  durationMs: 200000,
  albumArtUrl: '',
  devices: [],
}

export const mockWebSocketContext = {
  spotifyData: mockSpotifyData,
  timerData: {
    currentPhase: 'WORK',
    timeRemaining: 20,
    timeElapsed: 0,
    mode: 'TABATA',
    workDuration: 20,
    restDuration: 10,
    soundEventId: 0,
  },
  sendData: jest.fn(),
  connectionStatus: 'Connected',
  lastMessage: null,
  hrmData: {
    heartRate: 0,
    rrInterval: 0,
    batteryLevel: 0,
    status: '',
    color: '',
  },
}