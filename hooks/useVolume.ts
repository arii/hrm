// File: hooks/useVolume.ts
/**
 * A centralized hook for managing volume across the application.
 * It synchronizes volume between user preferences, local audio, and the Spotify SDK.
 */
import { useCallback, useEffect } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyVolumeControl } from './useSpotifyVolumeControl'
import { audioManager } from '@/utils/audioManager'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

export const useVolume = () => {
  const { spotifyData } = useWebSocket()
  const [prefs, setPrefs] = useUserSettings()
  const { setVolume: setSpotifyVolume } = useSpotifyVolumeControl()
  const volume = prefs.volumeLevel

  const setVolume = useCallback(
    (value: number, source: 'user' | 'spotify' = 'user') => {
      const sanitized = clampVolume(value)
      setPrefs((prevPrefs) => ({
        ...prevPrefs,
        volumeLevel: sanitized,
      }))

      // If the change is from the user, update Spotify
      if (source === 'user') {
        setSpotifyVolume(sanitized)
      }
    },
    [setPrefs, setSpotifyVolume]
  )

  // Sync with Spotify volume changes
  useEffect(() => {
    if (spotifyData?.device?.volume_percent !== undefined) {
      const spotifyVolume = spotifyData.device.volume_percent
      if (spotifyVolume !== volume) {
        setVolume(spotifyVolume, 'spotify')
      }
    }
  }, [spotifyData?.device?.volume_percent, volume, setVolume])

  // Update local audio manager volume
  useEffect(() => {
    audioManager.setVolume(volume)
  }, [volume])

  return { volume, setVolume, clampVolume, volumeToScalar }
}
