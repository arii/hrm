'use client'

import { useState, useEffect, useCallback } from 'react'
import { SpotifyDevice } from '@/types/core'
import { API_SPOTIFY_DEVICES } from '@/constants/apiEndpoints'
import logger from '@/utils/logger'

interface UseSpotifyDevicesReturn {
  devices: SpotifyDevice[]
  loading: boolean
  error: string | null
  refreshDevices: () => void
}

const useSpotifyDevices = (): UseSpotifyDevicesReturn => {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(API_SPOTIFY_DEVICES)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setDevices(Array.isArray(data) ? data : [])
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred'
      setError(errorMessage)
      logger.error({ error: e }, 'Failed to fetch Spotify devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  return { devices, loading, error, refreshDevices: fetchDevices }
}

export default useSpotifyDevices
