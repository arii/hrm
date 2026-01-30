import { WebSocketState } from '@/context/webSocketReducer'

// Time in milliseconds to wait before showing a throttled warning for connection issues.
export const THROTTLED_WARNING_TIMEOUT = 5000

// Time in milliseconds for the heartbeat interval.
export const HEARTBEAT_INTERVAL = 30000

// Time in milliseconds for the pong timeout.
export const PONG_TIMEOUT = 15000

// The initial delay for the first reconnection attempt.
export const INITIAL_RECONNECT_DELAY = 1000

// The factor by which the reconnection delay is randomized.
export const JITTER_FACTOR = 0.2

// The maximum number of reconnection attempts.
export const MAX_RECONNECT_ATTEMPTS = 10

export const INITIAL_STATE: WebSocketState = {
  hrmData: [],
  timerData: {
    isRunning: false,
    currentPhase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    caloriesBurned: 0,
    mode: 'TABATA',
    workDuration: 30,
    restDuration: 10,
    soundEventId: 0,
  },
  spotifyData: {
    trackId: null,
    trackName: 'Awaiting Login...',
    artist: '',
    albumName: '',
    albumArtUrl: '',
    isPlaying: false,
    devices: [],
    volume: 70,
    isMuted: false,
  },
  activeAlerts: [],
  spotifyServiceInitialized: false,
}
