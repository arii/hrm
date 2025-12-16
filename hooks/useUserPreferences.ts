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
  userHeight: number | null
  userWeight: number | null
  userGender: 'male' | 'female' | null
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
    userHeight: null,
    userWeight: null,
    userGender: null,
  })

  return [prefs, setPrefs] as const
}
