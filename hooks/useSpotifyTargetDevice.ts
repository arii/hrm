
import { useMemo, useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { SpotifyCommandMessage } from '@/types/websocket'

export const useSpotifyTargetDevice = (selectedDeviceId: string, dispatch: (action: any) => void) => {
  const { spotifyData, sendData } = useWebSocket()
  const { deviceId } = useSpotifyWebPlayback()

  const targetDeviceId = useMemo(() => {
    const devices = spotifyData.devices || []
    const activeDevice = devices.find((d) => d.is_active)
    if (activeDevice) {
      return activeDevice.id
    }
    if (deviceId && devices.some((d) => d.id === deviceId)) {
      return deviceId
    }
    return ''
  }, [spotifyData.devices, deviceId])

  useEffect(() => {
    if (selectedDeviceId !== targetDeviceId) {
        dispatch({ type: 'SELECT_DEVICE', payload: targetDeviceId })
    }

    const activeDevice = spotifyData.devices?.find((d) => d.is_active)
    if (!activeDevice && targetDeviceId === deviceId) {
        const message: SpotifyCommandMessage = {
            type: 'SPOTIFY_COMMAND',
            command: 'TRANSFER_PLAYBACK',
            deviceId: targetDeviceId,
        }
        sendData(message)
    }
  }, [targetDeviceId, selectedDeviceId, deviceId, spotifyData.devices, sendData, dispatch])

  return targetDeviceId
}
