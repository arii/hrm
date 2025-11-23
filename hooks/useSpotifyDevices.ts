// File: hooks/useSpotifyDevices.ts
import { SpotifyDevice } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export const useSpotifyDevices = (isSpotifyReady: boolean) => {
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSpotifyReady) {
      const fetchDevices = async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          setAvailableDevices(Array.isArray(devices) ? devices : [])
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load devices.'
          console.error('Failed to fetch Spotify devices:', err)
          setError(errorMessage)
        } finally {
          setLoading(false)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
      setLoading(false)
      setError(null)
    }
  }, [isSpotifyReady])

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }

    const activeDevice = availableDevices.find((device) => device.is_active)
    const lastSelectedId = localStorage.getItem('spotify_last_device_id')

    if (
      lastSelectedId &&
      availableDevices.some((d) => d.id === lastSelectedId)
    ) {
      if (selectedDeviceId !== lastSelectedId) {
        setSelectedDeviceId(lastSelectedId)
      }
      return
    }

    if (!selectedDeviceId && activeDevice) {
      setSelectedDeviceId(activeDevice.id)
      return
    }

    if (
      selectedDeviceId &&
      !availableDevices.some((device) => device.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(activeDevice?.id ?? '')
    }
  }, [availableDevices, selectedDeviceId])

  const handleSetSelectedDeviceId = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    localStorage.setItem('spotify_last_device_id', deviceId)
  }, [])

  return {
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId: handleSetSelectedDeviceId,
    loading,
    error,
  }
}
