// context/AppStateContext.tsx
'use client';
import { createContext, ReactNode, useContext, useReducer, useRef } from 'react';
import {
  HrmData,
  SpotifyData,
  TimerData,
  ServerMessage,
} from '../types/websocket';
import throttle from 'lodash/throttle';

interface AppState {
  hrmData: HrmData[];
  timerData: TimerData;
  spotifyData: SpotifyData;
  spotifyServiceInitialized?: boolean;
}

const INITIAL_STATE: AppState = {
  hrmData: [],
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
  spotifyData: { trackName: 'Awaiting Login...', artist: '', isPlaying: false },
  spotifyServiceInitialized: true,
};

interface AppStateContextType extends AppState {
  dispatch: React.Dispatch<ServerMessage>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const reducer = (state: AppState, message: ServerMessage): AppState => {
    switch (message.type) {
      case 'INITIAL_STATE':
        return { ...state, ...message.payload };
      case 'HRM_UPDATE':
        return { ...state, hrmData: message.payload };
      case 'TIMER_UPDATE':
        return { ...state, timerData: message.payload };
      case 'SPOTIFY_UPDATE':
        return { ...state, spotifyData: message.payload };
      case 'SPOTIFY_SERVICE_INIT_UPDATE':
        return { ...state, spotifyServiceInitialized: message.payload };
      default:
        return state;
    }
  };

  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE);

  const throttledDispatch = useRef(
    throttle((message: ServerMessage) => {
      dispatch(message);
    }, 100)
  ).current;

  const dispatchWrapper = (message: ServerMessage) => {
    if (message.type === 'HRM_UPDATE' || message.type === 'TIMER_UPDATE') {
      throttledDispatch(message);
    } else {
      dispatch(message);
    }
  };

  const contextValue = {
    ...appState,
    dispatch: dispatchWrapper,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
