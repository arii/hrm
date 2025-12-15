// hooks/useSpotifyDevices.ts
import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types'

export const useSpotifyDevices = () => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/spotify/devices')
      if (!response.ok) {
        throw new Error('Failed to fetch devices')
      }
      const data = await response.json()
      setDevices(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const transferPlayback = useCallback(
    async (deviceId: string) => {
      try {
        const response = await fetch('/api/spotify/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'TRANSFER_PLAYBACK',
            deviceId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to transfer playback')
        }

        // Optimistically update the active device
        setDevices((prevDevices) =>
          prevDevices.map((d) => ({
            ...d,
            is_active: d.id === deviceId,
          }))
        )

        // Refetch devices to get the latest state from the API
        await fetchDevices()
      } catch (e) {
        console.error('Failed to transfer playback', e)
        // TODO: Implement user-facing error handling via global toast
        setError(e as Error)
      }
    },
    [fetchDevices]
  )

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  return { devices, isLoading, error, fetchDevices, transferPlayback }
}
