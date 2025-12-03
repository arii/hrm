// File: hooks/useVolumePreference.ts
// Provides a shared volume preference persisted via the UserSettingsContext.
import { useCallback } from 'react'

import { useUserSettings } from '@/context/UserSettingsContext'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

const useVolumePreference = () => {
  const [prefs, setPrefs] = useUserSettings()
  const volume = prefs.volumeLevel

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
