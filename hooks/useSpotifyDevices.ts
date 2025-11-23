import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types'

export const useSpotifyDevices = (shouldFetch: boolean = true) => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    if (!shouldFetch) {
      setDevices([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/spotify/devices')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const deviceList = Array.isArray(data) ? data : []
      setDevices(deviceList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices')
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [shouldFetch])

  // Initial fetch
  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  // Load selection from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('spotify_last_device_id')
      if (savedId) {
        setSelectedDeviceIdState(savedId)
      }
    }
  }, [])

  // Smart selection logic
  useEffect(() => {
    if (devices.length === 0) {
      // If we used to have devices but now don't, we might want to keep the selected ID
      // if it was manually selected (from localStorage), or clear it.
      // Existing behavior suggests clearing it if we fetch and find nothing.
      // But if we are simply not fetching (shouldFetch=false), we shouldn't necessarily clear it?
      // For now, mirroring existing behavior: if fetched empty list, ensure selected is empty if it was invalid.
      // But wait, if devices are empty, we can't validate the ID.

      // Actually, existing behavior in SpotifyControls.tsx:
      // if (availableDevices.length === 0) { if (selected != '') setSelected(''); return; }
      if (shouldFetch && !loading) {
         // Only clear if we actually tried to fetch and got nothing
         if (selectedDeviceId !== '') {
            setSelectedDeviceIdState('')
         }
      }
      return
    }

    const activeDevice = devices.find((d) => d.is_active)

    // If no selection yet, try active device
    if (!selectedDeviceId) {
        if (activeDevice) {
            setSelectedDeviceId(activeDevice.id)
        } else if (devices.length > 0) {
             // Fallback to first available device
             setSelectedDeviceId(devices[0].id)
        }
        return
    }

    // If selection exists but isn't in list
    const deviceExists = devices.some(d => d.id === selectedDeviceId)
    if (!deviceExists) {
        if (activeDevice) {
             setSelectedDeviceId(activeDevice.id)
        } else {
             // If selected device is gone and no active device, revert to first or nothing.
             // Existing code: setSelectedDeviceId(activeDevice?.id ?? '')
             setSelectedDeviceId(activeDevice?.id ?? devices[0]?.id ?? '')
        }
    }
  }, [devices, selectedDeviceId, shouldFetch, loading])

  const setSelectedDeviceId = useCallback((id: string) => {
    setSelectedDeviceIdState(id)
    if (typeof window !== 'undefined') {
      if (id) {
          localStorage.setItem('spotify_last_device_id', id)
      } else {
          localStorage.removeItem('spotify_last_device_id')
      }
    }
  }, [])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    loading,
    error,
    refreshDevices: fetchDevices
  }
}
