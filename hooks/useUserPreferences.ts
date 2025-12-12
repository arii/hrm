// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userName: string
  userAge: string
  deviceId: string
  maxHr: number;
}

export const useUserPreferences = () => {
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('user-prefs', {
    theme: 'dark',
    volumeLevel: 70,
    defaultWorkDuration: 20,
    defaultRestDuration: 10,
    favoritePlaylist: null,
    userName: '',
    userAge: '',
    deviceId: '',
  })

  const maxHr = 220 - (parseInt(prefs.userAge) || 0)

  return [{ ...prefs, maxHr }, setPrefs] as const
}
