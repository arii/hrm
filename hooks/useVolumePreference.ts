import { useCallback, useEffect, useState } from 'react'
import { audioManager } from '../utils/audioManager'

const VOLUME_KEY = 'hrm-volume'
const MUTE_KEY = 'hrm-muted'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

const useVolumePreference = (defaultVolume = 70) => {
  const [volume, setVolumeState] = useState(clampVolume(defaultVolume))
  const [isMuted, setMutedState] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const storedVolume = window.localStorage.getItem(VOLUME_KEY)
      const storedMute = window.localStorage.getItem(MUTE_KEY)

      if (storedVolume !== null) {
        setVolumeState(clampVolume(Number(storedVolume)))
      }
      if (storedMute !== null) {
        setMutedState(storedMute === 'true')
      }
    } catch (error) {
        if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            console.warn('LocalStorage is not available. Audio settings will not be persisted.', error)
        } else {
            console.warn('Failed to read audio settings from localStorage:', error)
        }
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      audioManager.setVolume(volume)
      audioManager.setMuted(isMuted)
    }
  }, [volume, isMuted, isLoaded])

  const setVolume = useCallback((newVolume: number) => {
    const clamped = clampVolume(newVolume)
    setVolumeState(clamped)
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped))
      window.dispatchEvent(new CustomEvent('hrm:volumeChange', { detail: clamped }))
      if (clamped > 0 && isMuted) {
        setMutedState(false)
        window.localStorage.setItem(MUTE_KEY, 'false')
        window.dispatchEvent(new CustomEvent('hrm:muteChange', { detail: false }))
      }
    } catch (error) {
        if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            console.warn('LocalStorage is not available. Could not persist volume.', error)
        } else {
            console.warn('Could not persist volume:', error)
        }
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setMutedState(newMuted)
    try {
      window.localStorage.setItem(MUTE_KEY, String(newMuted))
      window.dispatchEvent(new CustomEvent('hrm:muteChange', { detail: newMuted }))
    } catch (error) {
        if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            console.warn('LocalStorage is not available. Could not persist mute status.', error)
        } else {
            console.warn('Could not persist mute status:', error)
        }
    }
  }, [isMuted])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === VOLUME_KEY && e.newValue) {
        setVolumeState(clampVolume(Number(e.newValue)))
      }
      if (e.key === MUTE_KEY && e.newValue) {
        setMutedState(e.newValue === 'true')
      }
    }

    const handleLocalVolume = (e: Event) => {
      const customEvent = e as CustomEvent
      setVolumeState(customEvent.detail)
    }

    const handleLocalMute = (e: Event) => {
      const customEvent = e as CustomEvent
      setMutedState(customEvent.detail)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('hrm:volumeChange', handleLocalVolume)
    window.addEventListener('hrm:muteChange', handleLocalMute)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('hrm:volumeChange', handleLocalVolume)
      window.removeEventListener('hrm:muteChange', handleLocalMute)
    }
  }, [])

  return { volume, setVolume, muted: isMuted, toggleMute, isLoaded }
}

export default useVolumePreference
