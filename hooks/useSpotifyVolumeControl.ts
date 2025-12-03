// hooks/useSpotifyVolumeControl.ts
import { useWebSocket } from '@/context/WebSocketContext'
import { useCallback } from 'react'

export const useSpotifyVolumeControl = () => {
  const { sendData, connectionStatus, spotifyData } = useWebSocket()

  const setVolume = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return

      const activeDevice = spotifyData?.devices?.find(device => device.is_active)
      if (!activeDevice) return

      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume,
        deviceId: activeDevice.id,
      })
    },
    [connectionStatus, sendData, spotifyData?.devices]
  )

  return { setVolume }
}
