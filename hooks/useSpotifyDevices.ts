'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyDevice } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export const useSpotifyDevices = () => {
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { devices = [] } = spotifyData
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
      setLoading(false)
    }
  }, [connectionStatus, sendData])

  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    if (activeDevice) {
      setSelectedDeviceId(activeDevice.id)
    }
  }, [devices])

  const transferPlayback = useCallback(
    (deviceId: string) => {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'TRANSFER_PLAYBACK',
        deviceId,
      })
    },
    [sendData]
  )

  return {
    devices,
    selectedDeviceId,
    loading,
    transferPlayback,
  }
}
