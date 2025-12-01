// hooks/useVolume.ts
import { useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useUserSettings } from '../context/UserSettingsContext'
import { SpotifyCommandMessage } from '@/types/websocket'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

/**
 * Provides a unified volume control, syncing state with localStorage
 * and the Spotify playback service via WebSocket.
 *
 * @returns An object with the current volume and functions to set it.
 */
const useVolume = () => {
  const [prefs, setPrefs] = useUserSettings()
  const { sendData, spotifyData } = useWebSocket()
  const volume = prefs.volumeLevel

  const setVolume = useCallback(
    (newVolume: number) => {
      const sanitized = clampVolume(newVolume)
      setPrefs((prevPrefs) => ({
        ...prevPrefs,
        volumeLevel: sanitized,
      }))
    },
    [setPrefs]
  )

  const commitVolumeChange = useCallback(
    (finalVolume: number) => {
      if (spotifyData.targetDeviceId) {
        const message: SpotifyCommandMessage = {
          type: 'SPOTIFY_COMMAND',
          command: 'SET_VOLUME',
          deviceId: spotifyData.targetDeviceId,
          volume: clampVolume(finalVolume),
        }
        sendData(message)
      }
    },
    [sendData, spotifyData.targetDeviceId]
  )

  return { volume, setVolume, commitVolumeChange }
}

export default useVolume
