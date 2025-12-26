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
      console.log(
        '[TimerSoundProvider] User interaction detected, initializing audio...'
      )
      audioManager.unlockAudioContext()
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
    const handleKeyDown = (event: KeyboardEvent) => {
      // Mute Toggle
      if (event.key === 'm') {
        audioManager.toggleMute()
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
