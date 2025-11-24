// File: hooks/useSpotifyDevices.ts
import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types'

export const useSpotifyDevices = (hasSpotifyData: boolean) => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    if (!hasSpotifyData) {
      setDevices([])
      setSelectedDeviceId('')
      setLoading(false)
      setError(null)
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
      setDevices(Array.isArray(fetchedDevices) ? fetchedDevices : [])
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to load devices.'
      console.error('Failed to fetch Spotify devices:', e)
      setError(errorMessage)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [hasSpotifyData])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  useEffect(() => {
    if (devices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }

    const activeDevice = devices.find((device) => device.is_active)
    const currentDeviceValid = devices.some(
      (device) => device.id === selectedDeviceId
    )

    if (activeDevice && !currentDeviceValid) {
      setSelectedDeviceId(activeDevice.id)
    } else if (!selectedDeviceId && devices.length > 0) {
      setSelectedDeviceId(devices[0].id)
    }
  }, [devices, selectedDeviceId])

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) return selectedDeviceId
    const activeDevice = devices.find((d) => d.is_active)
    return activeDevice?.id ?? devices[0]?.id
  }, [devices, selectedDeviceId])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    loading,
    error,
    fetchDevices,
    resolveTargetDeviceId,
  }
}
