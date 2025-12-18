// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'
import { Unit, lbsToKg } from '@/lib/units'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userName: string | null
  userAge: number | null
  unit: Unit
  height: number | null
  weight: number | null
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
    unit: 'imperial',
    height: 180,
    weight: lbsToKg(175),
  })

  return [prefs, setPrefs] as const
}
