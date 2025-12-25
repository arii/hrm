'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyDevice } from '@/types/core'
import { useDebounce } from 'use-debounce'
import logger from '@/utils/logger'
import { useSession } from 'next-auth/react'
import { SpotifyCommandMessage } from '@/types/websocket'

const API_SPOTIFY_DEVICES = '/api/spotify/devices'

export const useSpotifyDevices = () => {
  const { spotifyData, sendData } = useWebSocket()
  const { status } = useSession()
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [debouncedTrackName] = useDebounce(spotifyData.trackName, 500)

  const fetchDevices = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(API_SPOTIFY_DEVICES)
      if (!response.ok) {
        throw new Error('Failed to fetch Spotify devices')
      }
      const data = await response.json()
      setDevices(data.devices || [])

      const activeDevice = data.devices?.find(
        (d: SpotifyDevice) => d.is_active
      )
      if (activeDevice) {
        setSelectedDeviceId(activeDevice.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      logger.error({ err }, 'Error fetching spotify devices')
    } finally {
      setIsLoading(false)
    }
  }, [status, spotifyData.trackName])

  useEffect(() => {
    fetchDevices()
  }, [debouncedTrackName, fetchDevices])

  const handleDeviceSelected = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'TRANSFER_PLAYBACK',
      deviceId: deviceId,
    }
    sendData(message)
  }

  return {
    devices,
    selectedDeviceId,
    isLoading,
    error,
    refreshDevices: fetchDevices,
    handleDeviceSelected,
  }
}
