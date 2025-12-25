// hooks/useSpotifyControl.ts
import { SpotifyDevice } from '@/types'
import { useWebSocket } from '@/context/WebSocketContext'
import { useEffect, useState, useCallback } from 'react'

export const useSpotifyControl = () => {
  const { spotifyData, sendData } = useWebSocket()
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (spotifyData.devices && spotifyData.devices.length > 0) {
      setAvailableDevices(spotifyData.devices)
      if (!selectedDeviceId) {
        const activeDevice = spotifyData.devices.find((d) => d.is_active)
        if (activeDevice) {
          setSelectedDeviceId(activeDevice.id)
        } else {
          setSelectedDeviceId(spotifyData.devices[0].id)
        }
      }
    }
  }, [spotifyData.devices, selectedDeviceId])

  const sendCommand = useCallback(
    async (
      command: string,
      options: Record<string, unknown> = {},
      commandKey?: string
    ) => {
      const key = commandKey || command
      setLoading((prev) => ({ ...prev, [key]: true }))
      setError(null)
      setSuccess(null)
      try {
        await sendData({
          type: 'SPOTIFY_COMMAND',
          command,
          deviceId: selectedDeviceId,
          ...options,
        })
        setSuccess(`${command} command sent successfully.`)
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'An unknown error occurred.'
        setError(`Failed to send ${command} command: ${errorMessage}`)
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }))
      }
    },
    [sendData, selectedDeviceId]
  )

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendCommand(
      'TRANSFER_PLAYBACK',
      { deviceId },
      `transfer-${deviceId}`
    ).then(() => {
      setSuccess('Playback transferred successfully.')
    })
  }

  return {
    spotifyData,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId: handleDeviceChange,
    sendCommand,
    loading,
    error,
    success,
  }
}
