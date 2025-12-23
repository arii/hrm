'use client'

import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types'
import { API_SPOTIFY_DEVICES } from '@/constants/apiEndpoints'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'

export interface UseSpotifyDevicesReturn {
  devices: SpotifyDevice[]
  selectedDeviceId: string | null
  isLoading: boolean
  error: Error | null
  refreshDevices: () => void
  selectDevice: (deviceId: string) => void
}

export const useSpotifyDevices = (): UseSpotifyDevicesReturn => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const { spotifyData } = useWebSocket()

  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(API_SPOTIFY_DEVICES)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const deviceArray = Array.isArray(data) ? data : []
      setDevices(deviceArray)
    } catch (e) {
      const err =
        e instanceof Error ? e : new Error('Failed to fetch Spotify devices')
      setError(err)
      logger.error({ error: err }, err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (spotifyData.trackName) {
      fetchDevices()
    } else {
      setDevices([])
      setSelectedDeviceId(null)
    }
  }, [spotifyData.trackName, fetchDevices])

  useEffect(() => {
    if (devices.length > 0) {
      const activeDevice = devices.find((d) => d.is_active)
      if (activeDevice) {
        setSelectedDeviceId(activeDevice.id)
      }
    }
  }, [devices])

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
  }

  return {
    devices,
    selectedDeviceId,
    isLoading,
    error,
    refreshDevices: fetchDevices,
    selectDevice,
  }
}
