import { useCallback, useEffect, useRef, useState } from 'react'
import { audioManager } from '../utils/audioManager'

const STORAGE_KEY_VOL = 'hrm-preferred-volume' // Stores the user's last chosen volume
const STORAGE_KEY_MUTE = 'hrm-muted'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

/**
 * Manages user's volume and mute preferences with localStorage persistence.
 * This hook handles the logic of restoring volume after unmuting.
 * @param {number} defaultVolume - The default volume level (0-100).
 */
const useVolumePreference = (defaultVolume = 70) => {
  const sanitizedDefault = clampVolume(defaultVolume)
  const lastVolumeRef = useRef(sanitizedDefault)

  const [volume, setVolumeState] = useState(sanitizedDefault) // Effective volume
  const debouncedVolume = useDebounce(volume, 200) // Debounce volume changes for performance
  const [muted, setMutedState] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const storedMute = window.localStorage.getItem(STORAGE_KEY_MUTE)
      const storedVol = window.localStorage.getItem(STORAGE_KEY_VOL)

      const isMuted = storedMute === 'true'
      const preferredVolume =
        storedVol !== null ? clampVolume(Number(storedVol)) : sanitizedDefault
      lastVolumeRef.current = preferredVolume
      setMutedState(isMuted)
      setVolumeState(isMuted ? 0 : preferredVolume)
    } catch (error) {
      console.warn('Failed to read audio preferences from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [sanitizedDefault])

  useEffect(() => {
    if (isLoaded) {
      audioManager.setMuted(muted)
      audioManager.setVolume(volume)
    }
  }, [volume, muted, isLoaded])

  // Effect to persist debounced volume and mute state to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        if (debouncedVolume > 0) {
          window.localStorage.setItem(STORAGE_KEY_VOL, String(debouncedVolume))
          window.localStorage.setItem(STORAGE_KEY_MUTE, 'false')
        } else {
          window.localStorage.setItem(STORAGE_KEY_MUTE, 'true')
        }
      } catch (error) {
        console.warn('Could not persist volume preference:', error)
      }
    }
  }, [debouncedVolume, isLoaded])

  const setVolume = useCallback(
    (value: number) => {
      const sanitized = clampVolume(value)
      setVolumeState(sanitized)
      if (sanitized > 0) {
        lastVolumeRef.current = sanitized
        setMutedState(false)
      } else {
        setMutedState(true)
      }
      window.dispatchEvent(
        new CustomEvent('hrm:volumeChange', { detail: sanitized })
      )
    },
    [setMutedState]
  )

  const toggleMute = useCallback(() => {
    const isMuting = !muted
    setMutedState(isMuting)
    try {
      window.localStorage.setItem(STORAGE_KEY_MUTE, String(isMuting))
      if (isMuting) {
        if (volume > 0) {
          lastVolumeRef.current = volume
          window.localStorage.setItem(STORAGE_KEY_VOL, String(volume))
        }
        setVolumeState(0)
      } else {
        setVolumeState(lastVolumeRef.current)
      }
      window.dispatchEvent(
        new CustomEvent('hrm:muteChange', { detail: isMuting })
      )
    } catch (error) {
      console.warn('Could not persist mute preference:', error)
    }
  }, [muted, volume])

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
    window.addEventListener('hrm:volumeChange', handleLocalVolume)
    window.addEventListener('hrm:muteChange', handleLocalMute)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('hrm:volumeChange', handleLocalVolume)
      window.removeEventListener('hrm:muteChange', handleLocalMute)
    }
  }, [])

  return { volume, setVolume, muted, toggleMute, isLoaded }
}

export default useVolumePreference
