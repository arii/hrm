
// hooks/useVolume.ts
import { useCallback, useEffect } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import { audioManager } from '../utils/audioManager'

// Shared utilities from the old hook
export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

/**
 * A centralized hook for managing all application volume.
 * - Persists volume preference to UserSettingsContext.
 * - Controls volume for local audio effects (audioManager).
 * - Provides a method to synchronize volume with the Spotify player.
 */
const useVolume = () => {
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

  // Effect to update the audioManager whenever the volume changes
  useEffect(() => {
    const scalarVolume = volumeToScalar(volume)
    audioManager.setVolume(scalarVolume)
  }, [volume])

  /**
   * Synchronizes the application volume with a Spotify player instance.
   * @param player The Spotify player instance.
   */
  const syncSpotifyVolume = useCallback(
    (player: { setVolume: (volume: number) => Promise<void> } | null) => {
      if (player) {
        const scalarVolume = volumeToScalar(volume)
        player.setVolume(scalarVolume).catch((err) => {
          console.error('Failed to sync volume with Spotify', err)
        })
      }
    },
    [volume]
  )

  return { volume, setVolume, syncSpotifyVolume }
}

export default useVolume
