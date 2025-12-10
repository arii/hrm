import { useCallback, useEffect, useState } from 'react'
import { audioManager } from '../utils/audioManager'

const STORAGE_KEY_VOL = 'hrm-volume'
const STORAGE_KEY_MUTE = 'hrm-muted'

export const clampVolume = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

const useVolumePreference = (defaultVolume = 70) => {
  const sanitizedDefault = clampVolume(defaultVolume)

  // --- VOLUME STATE ---
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') return sanitizedDefault
    const stored = window.localStorage.getItem(STORAGE_KEY_VOL)
    return stored !== null ? clampVolume(Number(stored)) : sanitizedDefault
  })

  // --- MUTE STATE ---
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(STORAGE_KEY_MUTE)
    return stored === 'true'
  })

  // 1. Sync Volume to AudioManager (Beeps)
  useEffect(() => {
    audioManager.setVolume(volume)
  }, [volume])

  // 2. Sync Mute to AudioManager (Beeps)
  useEffect(() => {
    audioManager.setMuted(muted)
  }, [muted])

  // --- ACTIONS ---

  const setVolume = useCallback((value: number) => {
    const sanitized = clampVolume(value)
    setVolumeState(sanitized)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_VOL, String(sanitized))
      // Optional: Auto-unmute on volume change?
      // For now, we keep them independent to avoid complex race conditions.
      window.dispatchEvent(
        new CustomEvent('volumeChange', { detail: sanitized })
      )
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_MUTE, String(next))
        window.dispatchEvent(new CustomEvent('muteChange', { detail: next }))
      }
      return next
    })
  }, [])

  // --- CROSS-TAB SYNC ---
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_VOL && e.newValue !== null) {
        setVolumeState(clampVolume(Number(e.newValue)))
      }
      if (e.key === STORAGE_KEY_MUTE && e.newValue !== null) {
        setMutedState(e.newValue === 'true')
      }
    }

    const handleLocalVolume = (e: CustomEvent) => setVolumeState(e.detail)
    const handleLocalMute = (e: CustomEvent) => setMutedState(e.detail)

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('volumeChange', handleLocalVolume as EventListener)
    window.addEventListener('muteChange', handleLocalMute as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(
        'volumeChange',
        handleLocalVolume as EventListener
      )
      window.removeEventListener('muteChange', handleLocalMute as EventListener)
    }
  }, [])

  return { volume, setVolume, muted, toggleMute }
}

export default useVolumePreference
