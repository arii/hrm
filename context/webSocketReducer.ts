// context/webSocketReducer.ts
import { HrmData, ServerMessage } from '@/types/websocket';
import { HRM_HISTORY_LENGTH } from '@/utils/constants';

export interface HrmDataPoint {
  value: number;
  timestamp: number;
}

export interface HrmSessionStats {
  avgHr: number;
  maxHr: number;
  // Internal properties for calculation
  totalSamples: number;
  sumHr: number;
}

export interface WebSocketState {
  hrmData: HrmData[];
  timerData: any; // Use a more specific type if available
  spotifyData: any; // Use a more specific type if available
  activeAlerts: any[]; // Use a more specific type if available
  spotifyServiceInitialized?: boolean;
  // New state for HR metrics
  hrmDataHistory: { [clientId: string]: HrmDataPoint[] };
  hrmSessionStats: { [clientId: string]: HrmSessionStats };
}

export const INITIAL_STATE: WebSocketState = {
  hrmData: [],
  hrmDataHistory: {},
  hrmSessionStats: {},
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
  spotifyData: {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
    devices: [],
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
};

export const reducer = (state: WebSocketState, message: ServerMessage): WebSocketState => {
    switch (message.type) {
      case 'INITIAL_STATE':
        return {
          ...state,
          ...message.payload,
          hrmDataHistory: {},
          hrmSessionStats: {},
        };
      case 'HRM_UPDATE': {
        const now = Date.now();
        const newHistory = { ...state.hrmDataHistory };
        const newStats = { ...state.hrmSessionStats };

        for (const user of message.payload) {
          const clientId = user.clientId;
          const value = user.value;

          const history = newHistory[clientId] || [];
          const newHistoryPoint = { value, timestamp: now };
          newHistory[clientId] = [...history, newHistoryPoint].slice(-HRM_HISTORY_LENGTH);

          const stats = newStats[clientId] || { totalSamples: 0, sumHr: 0, maxHr: 0, avgHr: 0 };
          const newTotalSamples = stats.totalSamples + 1;
          const newSumHr = stats.sumHr + value;
          const newMaxHr = Math.max(stats.maxHr, value);
          const newAvgHr = Math.round(newSumHr / newTotalSamples);

          newStats[clientId] = {
            totalSamples: newTotalSamples,
            sumHr: newSumHr,
            maxHr: newMaxHr,
            avgHr: newAvgHr,
          };
        }

        return {
          ...state,
          hrmData: message.payload,
          hrmDataHistory: newHistory,
          hrmSessionStats: newStats,
        };
      }
      // Add other cases as needed...
      default:
        return state;
    }
};
