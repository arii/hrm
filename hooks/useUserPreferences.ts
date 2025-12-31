// hooks/useUserPreferences.ts
import useLocalStorage from './useLocalStorage'

export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  // Nullable fields represent user-provided data that may not yet be set.
  favoritePlaylist: string
  userName: string
  autoConnect: boolean

  /** @deprecated Use UserPhysicalProfileContext instead */
  userAge: number | null
  /** @deprecated Use UserPhysicalProfileContext instead */
  userWeight: number | null
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: '',
  userAge: null,
  userWeight: null,
  autoConnect: false,
}

export const useUserPreferences = () => {
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>(
    'user-prefs',
    DEFAULT_PREFERENCES
  )

  return [prefs, setPrefs] as const
}
