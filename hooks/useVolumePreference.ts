'use client'
import { useCallback, useEffect, useState } from 'react'
import { audioManager } from '../utils/audioManager'

const STORAGE_KEY_VOL = 'hrm-volume'
const STORAGE_KEY_MUTE = 'hrm-muted'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

const useVolumePreference = (defaultVolume = 70) => {
  const sanitizedDefault = clampVolume(defaultVolume)

  // 1. Initialize State with Server-Safe Defaults
  // We strictly use the default prop here to ensure Server HTML == Client Initial Render
  const [volume, setVolumeState] = useState<number>(sanitizedDefault)
  const [muted, setMutedState] = useState<boolean>(false)

  // Track if we have finished reading from localStorage
  const [isLoaded, setIsLoaded] = useState(false)

  // 2. Load Preferences on Client Mount
  useEffect(() => {
    try {
      const storedVol = window.localStorage.getItem(STORAGE_KEY_VOL)
      const storedMute = window.localStorage.getItem(STORAGE_KEY_MUTE)

      if (storedVol !== null) {
        setVolumeState(clampVolume(Number(storedVol)))
      }

      if (storedMute !== null) {
        setMutedState(storedMute === 'true')
      }
    } catch (error) {
      console.warn('Failed to read audio preferences from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // 3. Sync State to AudioManager (Effect)
  // We only sync specific values to avoid race conditions during the initial load
  useEffect(() => {
    if (isLoaded) {
      audioManager.setVolume(volume)
    }
  }, [volume, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      audioManager.setMuted(muted)
    }
  }, [muted, isLoaded])

  // --- ACTIONS ---

  const setVolume = useCallback((value: number) => {
    const sanitized = clampVolume(value)
    setVolumeState(sanitized)

    // Side effects (Storage + Event)
    try {
      window.localStorage.setItem(STORAGE_KEY_VOL, String(sanitized))
      window.dispatchEvent(
        new CustomEvent('volumeChange', { detail: sanitized })
      )
    } catch (_e) {
      // Ignore storage errors (e.g. Incognito mode quotas)
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY_MUTE, String(next))
        window.dispatchEvent(new CustomEvent('muteChange', { detail: next }))
      } catch (_e) {
        // Ignore storage errors
      }
      return next
    })
  }, [])

  // --- CROSS-TAB SYNC ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_VOL && e.newValue !== null) {
        setVolumeState(clampVolume(Number(e.newValue)))
      }
      if (e.key === STORAGE_KEY_MUTE && e.newValue !== null) {
        setMutedState(e.newValue === 'true')
      }
    }

    // Custom events for same-tab synchronization (e.g. two components using this hook)
    const handleLocalVolume = (e: Event) => {
      const customEvent = e as CustomEvent
      setVolumeState(customEvent.detail)
    }

    const handleLocalMute = (e: Event) => {
      const customEvent = e as CustomEvent
      setMutedState(customEvent.detail)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('volumeChange', handleLocalVolume)
    window.addEventListener('muteChange', handleLocalMute)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('volumeChange', handleLocalVolume)
      window.removeEventListener('muteChange', handleLocalMute)
    }
  }, [])

  return { volume, setVolume, muted, toggleMute, isLoaded }
}

export default useVolumePreference
