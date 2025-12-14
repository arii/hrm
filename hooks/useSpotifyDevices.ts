'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useCallback, useEffect, useState, useRef } from 'react'

export const useSpotifyDevices = () => {
  const { spotifyData, connectionStatus, sendData } = useWebSocket()
  const { devices = [] } = spotifyData

  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestTimeout = useRef<NodeJS.Timeout | null>(null)

  // This effect manages the lifecycle of fetching devices based on connection status.
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      // Reset state for a new connection session. This is a valid use case for
      // setting state in an effect, as it's a reaction to an external event.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null)

      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current)
      }

      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })

      // Set a timeout to handle cases where the device list never arrives.
      requestTimeout.current = setTimeout(() => {
        setLoading((isLoading) => {
          if (isLoading) {
            setError('Failed to fetch Spotify devices in a timely manner.')
            return false // Stop loading on timeout.
          }
          return isLoading
        })
      }, 10000)
    } else {
      // If disconnected, reset to a loading state for the next connection attempt.
      setLoading(true)
    }

    // Cleanup timeout on disconnect or re-render.
    return () => {
      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current)
      }
    }
  }, [connectionStatus, sendData])

  // This effect processes the device list when it arrives from the WebSocket.
  useEffect(() => {
    if (devices.length > 0) {
      // Stop loading once we have devices.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      if (requestTimeout.current) {
        clearTimeout(requestTimeout.current)
      }
    }

    const activeDevice = devices.find((d) => d.is_active)
    const activeDeviceId = activeDevice?.id

    // Sync the selected device with the active one from the server.
    setSelectedDeviceId((currentSelectedId) => {
      if (activeDeviceId && activeDeviceId !== currentSelectedId) {
        return activeDeviceId
      }
      if (
        currentSelectedId &&
        !devices.some((d) => d.id === currentSelectedId)
      ) {
        return activeDeviceId ?? ''
      }
      return currentSelectedId
    })
  }, [devices])

  const transferPlayback = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId) // Optimistic update
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
    error,
    transferPlayback,
  }
}
