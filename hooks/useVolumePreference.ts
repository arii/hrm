// File: hooks/useVolumePreference.ts
// Provides a shared volume preference persisted via the UserSettingsContext.
import { useCallback, useSyncExternalStore } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

const emptySubscribe = () => () => {}

const useVolumePreference = () => {
  const [prefs, setPrefs] = useUserSettings()

  // Use useSyncExternalStore as a safe way to handle client-only values
  // The server snapshot returns false, client snapshot returns true
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Default to 70 (server-side default) until mounted to prevent hydration mismatch
  const volume = isMounted ? prefs.volumeLevel : 70

  const setVolume = useCallback(
    (value: number) => {
      const sanitized = clampVolume(value)
      setPrefs((prevPrefs) => ({
        ...prevPrefs,
        volumeLevel: sanitized,
      }))
    },
    [setPrefs]
  )

  return { volume, setVolume }
}

export default useVolumePreference
