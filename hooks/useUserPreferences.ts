// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userName: string | null
  userAge: number | null
  autoStartWorkout: boolean
  autoStartHeartRate: number
  autoStartSustainedDuration: number
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
    autoStartWorkout: false,
    autoStartHeartRate: 100,
    autoStartSustainedDuration: 30,
  })

  return [prefs, setPrefs] as const
}
