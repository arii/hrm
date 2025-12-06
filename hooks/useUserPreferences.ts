// hooks/useUserPreferences.ts
import { UserSettings } from '@/types'
import useLocalStorage from './useLocalStorage'

export const useUserPreferences = () => {
  const [prefs, setPrefs] = useLocalStorage<UserSettings>('user-prefs', {
    theme: 'dark',
    volumeLevel: 70,
    defaultWorkDuration: 20,
    defaultRestDuration: 10,
    favoritePlaylist: null,
  })

  return [prefs, setPrefs] as const
}
