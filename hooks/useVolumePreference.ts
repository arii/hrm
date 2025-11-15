// File: hooks/useVolumePreference.ts
// Provides a shared volume preference persisted to localStorage so multiple
// client surfaces (dashboard, control panel) stay in sync.
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'hrm-volume'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

export const volumeToScalar = (value: number): number =>
  Math.pow(clampVolume(value) / 100, 0.8)

const useVolumePreference = (defaultVolume = 70) => {
  const sanitizedDefault = clampVolume(defaultVolume)
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return sanitizedDefault
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const parsed = Number(stored)
      if (!Number.isNaN(parsed)) {
        return clampVolume(parsed)
      }
    }

    window.localStorage.setItem(STORAGE_KEY, String(sanitizedDefault))
    return sanitizedDefault
  })

  const setVolume = useCallback((value: number) => {
    const sanitized = clampVolume(value)
    setVolumeState(sanitized)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(sanitized))
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent('volumeChange', { detail: sanitized })
      )
    }
  }, [])

  // Listen for storage changes from other tabs and custom events from same tab
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const newVolume = clampVolume(Number(e.newValue))
        setVolumeState(newVolume)
      }
    }

    const handleVolumeChange = (e: CustomEvent) => {
      setVolumeState(e.detail)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('volumeChange', handleVolumeChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(
        'volumeChange',
        handleVolumeChange as EventListener
      )
    }
  }, [])

  return { volume, setVolume }
}

export default useVolumePreference
