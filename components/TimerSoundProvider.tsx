// File: components/TimerSoundProvider.tsx
/**
 * A provider component that ensures timer sound effects are initialized
 * on the first user interaction anywhere in the application.
 */
'use client'

import { useEffect } from 'react'
import { useTimerSounds } from '@/hooks/useTimerSounds'

interface TimerSoundProviderProps {
  children: React.ReactNode
}

const TimerSoundProvider = ({ children }: TimerSoundProviderProps) => {
  const { initializeAudio } = useTimerSounds()

  useEffect(() => {
    const handleFirstInteraction = () => {
      console.log('User interaction detected, initializing audio...')
      initializeAudio()
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
  }, [initializeAudio])

  return <>{children}</>
}

export default TimerSoundProvider
