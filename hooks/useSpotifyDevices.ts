// File: hooks/useSpotifyDevices.ts (NEW)
/**
 * Custom Hook: useSpotifyDevices
 *
 * This hook encapsulates the logic for fetching and managing Spotify devices.
 * It is designed to be used by any component that needs to interact with the
 * user's available playback devices.
 *
 * Features:
 * - Fetches the list of available devices from the Spotify API.
 * - Manages loading and error states for the device fetch.
 * - Tracks the currently selected device ID.
 * - Persists the last used device ID to localStorage.
 * - Provides a function to change the selected device.
 */
import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types/index'
import logger from '@/utils/logger'

const LOCAL_STORAGE_KEY = 'spotify_last_device_id'

export const useSpotifyDevices = (hasSpotifyData: boolean) => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    if (!hasSpotifyData) {
      setDevices([])
      setSelectedDeviceId(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/spotify/devices')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const fetchedDevices: SpotifyDevice[] = await response.json()
      setDevices(fetchedDevices)
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to load devices.'
      logger.error('Failed to fetch Spotify devices:', e)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [hasSpotifyData])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  useEffect(() => {
    const lastUsedId = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (lastUsedId) {
      setSelectedDeviceId(lastUsedId)
    }
  }, [])

  useEffect(() => {
    if (devices.length === 0) {
      if (selectedDeviceId !== null) {
        setSelectedDeviceId(null)
      }
      return
    }

    const activeDevice = devices.find((device) => device.is_active)
    const lastUsedDeviceExists = devices.some(
      (device) => device.id === selectedDeviceId
    )

    if (activeDevice && activeDevice.id !== selectedDeviceId) {
      setSelectedDeviceId(activeDevice.id)
    } else if (!lastUsedDeviceExists) {
      setSelectedDeviceId(activeDevice?.id ?? devices[0]?.id ?? null)
    }
  }, [devices, selectedDeviceId])

  const selectDevice = useCallback((deviceId: string | null) => {
    setSelectedDeviceId(deviceId)
    if (deviceId) {
      localStorage.setItem(LOCAL_STORAGE_KEY, deviceId)
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }, [])

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    loading,
    error,
    refetch: fetchDevices,
  }
}
