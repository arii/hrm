// File: components/TimerSoundProvider.tsx
/**
 * A provider component that ensures timer sound effects are initialized
 * on the first user interaction anywhere in the application.
 */
'use client'

import { useAudio } from '@/context/AudioContext'
import { useEffect } from 'react'

interface TimerSoundProviderProps {
  children: React.ReactNode
}

const TimerSoundProvider = ({ children }: TimerSoundProviderProps) => {
  const { audioManager, toggleMute, increaseVolume, decreaseVolume } =
    useAudio()

  useEffect(() => {
    const handleFirstInteraction = () => {
      console.log(
        '[TimerSoundProvider] User interaction detected, initializing audio...'
      )
      // The audio context is now responsible for initializing the manager
      audioManager?.loadAudio()
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
  }, [audioManager]) // Dependency on audioManager to ensure it's not null

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // We don't want to trigger shortcuts if the user is typing in an input.
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.key) {
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'ArrowUp':
          // Prevent default browser action (scrolling)
          event.preventDefault()
          increaseVolume()
          break
        case 'ArrowDown':
          // Prevent default browser action (scrolling)
          event.preventDefault()
          decreaseVolume()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
    // Now depends on the stable functions from the context
  }, [toggleMute, increaseVolume, decreaseVolume])

  return <>{children}</>
}

export default TimerSoundProvider
