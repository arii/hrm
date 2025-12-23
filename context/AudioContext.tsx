'use client'

import { createContext, useContext } from 'react'
import useVolumePreference from '@/hooks/useVolumePreference'

interface AudioContextType {
  volume: number
  setVolume: (volume: number) => void
  muted: boolean
  toggleMute: () => void
  isLoaded: boolean
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const volumePreference = useVolumePreference()
  return (
    <AudioContext.Provider value={volumePreference}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudioContext = () => {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider')
  }
  return context
}
