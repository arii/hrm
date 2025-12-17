// hooks/useTimerVolume.ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import { audioManager } from '@/utils/audioManager'
import useLocalStorage from './useLocalStorage'

const useTimerVolume = () => {
  const [storedVolume, setStoredVolume] = useLocalStorage('timerVolume', 70)
  const [storedMuted, setStoredMuted] = useLocalStorage('timerMuted', false)

  const [volume, setVolume] = useState(storedVolume)
  const [muted, setMuted] = useState(storedMuted)

  useEffect(() => {
    audioManager.setVolume(storedVolume)
    audioManager.setMuted(storedMuted)
  }, [storedVolume, storedMuted])

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume)
      setStoredVolume(newVolume)
      audioManager.setVolume(newVolume)
    },
    [setStoredVolume]
  )

  const handleToggleMute = useCallback(() => {
    const isMuted = audioManager.toggleMute()
    setMuted(isMuted)
    setStoredMuted(isMuted)
  }, [setStoredMuted])

  return {
    volume,
    muted,
    handleVolumeChange,
    handleToggleMute,
  }
}

export default useTimerVolume
