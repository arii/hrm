// File: components/TimerSoundProvider.tsx
/**
 * A provider component that ensures timer sound effects are initialized
 * on the first user interaction anywhere in the application.
 */
'use client'

import { useEffect } from 'react'
import { audioManager } from '../utils/audioManager'

interface TimerSoundProviderProps {
  children: React.ReactNode
}

const TimerSoundProvider = ({ children }: TimerSoundProviderProps) => {
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioManager.loadAudio()
      // Clean up listeners after initialization
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }

    // Attach listeners to detect the first user interaction
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)

    return () => {
      // Cleanup in case the component unmounts before interaction
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [])

  useEffect(() => {
    const VOLUME_STEP = 5
    const handleKeyDown = (event: KeyboardEvent) => {
      // Mute Toggle
      if (event.key === 'm') {
        audioManager.toggleMute()
      }

      // Volume Control
      if (event.key === 'ArrowUp') {
        const currentVolume = audioManager.getVolume()
        audioManager.setVolume(currentVolume + VOLUME_STEP)
      }
      if (event.key === 'ArrowDown') {
        const currentVolume = audioManager.getVolume()
        audioManager.setVolume(currentVolume - VOLUME_STEP)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return <>{children}</>
}

export default TimerSoundProvider
