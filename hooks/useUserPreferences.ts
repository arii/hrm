// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  // Nullable fields represent user-provided data that may not yet be set.
  favoritePlaylist: string | null
  userName: string | null
  userAge: number | null
  userWeight: number | null
  autoConnect: boolean
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
    userWeight: null,
    autoConnect: false,
  })

  return [prefs, setPrefs] as const
}
