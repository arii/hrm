// hooks/useUserPreferences.ts
import { useReducer, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

export interface UserPreferences {
  theme: 'dark' | 'light';
  volumeLevel: number;
  defaultWorkDuration: number;
  defaultRestDuration: number;
  favoritePlaylist: string | null;
}

export type Action =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_DEFAULT_WORK_DURATION'; payload: number }
  | { type: 'SET_DEFAULT_REST_DURATION'; payload: number }
  | { type: 'SET_FAVORITE_PLAYLIST'; payload: string | null }
  | { type: 'SET_PREFERENCES'; payload: UserPreferences };


const reducer = (state: UserPreferences, action: Action): UserPreferences => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_VOLUME':
      return { ...state, volumeLevel: action.payload };
    case 'SET_DEFAULT_WORK_DURATION':
      return { ...state, defaultWorkDuration: action.payload };
    case 'SET_DEFAULT_REST_DURATION':
      return { ...state, defaultRestDuration: action.payload };
    case 'SET_FAVORITE_PLAYLIST':
      return { ...state, favoritePlaylist: action.payload };
    case 'SET_PREFERENCES':
      return action.payload;
    default:
      return state;
  }
};

export const useUserPreferences = () => {
  const [storedValue, setStoredValue] = useLocalStorage<UserPreferences>('user-prefs', {
    theme: 'dark',
    volumeLevel: 70,
    defaultWorkDuration: 20,
    defaultRestDuration: 10,
    favoritePlaylist: null,
  });

  const [prefs, dispatch] = useReducer(reducer, storedValue);

  useEffect(() => {
    setStoredValue(prefs);
  }, [prefs, setStoredValue]);

  return [prefs, dispatch] as const;
};
