// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'

import { Gender } from '../types'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userName: string | null
  userAge: number | null
  userWeight: number | null
  gender: Gender | null
}

export const useUserPreferences = () => {
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('user-prefs', {
    theme: 'dark',
    volumeLevel: 70,
    defaultWorkDuration: 20,
    defaultRestDuration: 10,
    favoritePlaylist: null,
    userName: null,
    userAge: null,
    userWeight: 70,
    gender: 'MALE',
  })

  return [prefs, setPrefs] as const
}
