import { useCallback, useEffect, useState, useRef } from 'react'
import { audioManager } from '../utils/audioManager'

const VOLUME_KEY = 'hrm-volume'
const MUTE_KEY = 'hrm-muted'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

const useVolumePreference = (defaultVolume = 70) => {
  const [volume, setVolumeState] = useState(clampVolume(defaultVolume))
  const [isMuted, setMutedState] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const lastVolumeRef = useRef(clampVolume(defaultVolume));


  useEffect(() => {
    try {
      const storedVolume = window.localStorage.getItem(VOLUME_KEY)
      const storedMute = window.localStorage.getItem(MUTE_KEY)

      const preferredVolume = storedVolume !== null ? clampVolume(Number(storedVolume)) : clampVolume(defaultVolume);
      lastVolumeRef.current = preferredVolume;

      const isMuted = storedMute === 'true';

      setMutedState(isMuted);
      setVolumeState(isMuted ? 0 : preferredVolume);

    } catch (error) {
        if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            console.warn('LocalStorage is not available. Audio settings will not be persisted.', error)
        } else {
            console.warn('Failed to read audio settings from localStorage:', error)
        }
    } finally {
      setIsLoaded(true)
    }
  }, [defaultVolume])

  useEffect(() => {
    if (isLoaded) {
      audioManager.setVolume(volume)
      audioManager.setMuted(isMuted)
    }
  }, [volume, isMuted, isLoaded])

  const setVolume = useCallback((newVolume: number) => {
    const clamped = clampVolume(newVolume)
    setVolumeState(clamped);
    if (clamped > 0) {
        lastVolumeRef.current = clamped;
        setMutedState(false);
    } else {
        setMutedState(true);
    }

    try {
      window.localStorage.setItem(VOLUME_KEY, String(lastVolumeRef.current))
      window.localStorage.setItem(MUTE_KEY, String(clamped === 0));
      window.dispatchEvent(new CustomEvent('hrm:volumeChange', { detail: clamped }))
      window.dispatchEvent(new CustomEvent('hrm:muteChange', { detail: clamped === 0 }))
    } catch (error) {
        if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) {
            console.warn('LocalStorage is not available. Could not persist volume.', error)
        } else {
            console.warn('Could not persist volume:', error)
        }
    }
  }, [])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setMutedState(newMuted)
    setVolumeState(newMuted ? 0 : lastVolumeRef.current);
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
        const newVolume = clampVolume(Number(e.newValue));
        lastVolumeRef.current = newVolume;
        if (!isMuted) {
            setVolumeState(newVolume);
        }
      }
      if (e.key === MUTE_KEY && e.newValue) {
        const newMuted = e.newValue === 'true';
        setMutedState(newMuted);
        setVolumeState(newMuted ? 0 : lastVolumeRef.current);
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
  }, [isMuted])

  return { volume, setVolume, muted: isMuted, toggleMute, isLoaded }
}

export default useVolumePreference
