// hooks/useUserPreferences.ts
import { UnitSystem } from '@/utils/units'
import useLocalStorage from './useLocalStorage'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userName: string | null
  userAge: number | null
  unitSystem: UnitSystem
  userWeight: number | null
}

import { DEFAULT_UNIT_SYSTEM } from '@/utils/constants'

export const useUserPreferences = () => {
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('user-prefs', {
    theme: 'dark',
    volumeLevel: 70,
    defaultWorkDuration: 20,
    defaultRestDuration: 10,
    favoritePlaylist: null,
    userName: null,
    userAge: null,
    unitSystem: DEFAULT_UNIT_SYSTEM,
    userWeight: 165,
  })

  return [prefs, setPrefs] as const
}
