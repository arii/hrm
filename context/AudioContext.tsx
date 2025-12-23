// context/AudioContext.tsx
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react'
import { AudioManager } from '@/utils/audioManager'

interface AudioContextState {
  volume: number
  isMuted: boolean
  setVolume: (volume: number) => void
  toggleMute: () => void
  increaseVolume: (amount?: number) => void
  decreaseVolume: (amount?: number) => void
  audioManager: AudioManager | null
}

const AudioContext = createContext<AudioContextState | undefined>(undefined)

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolumeState] = useState(70)
  const [isMuted, setIsMuted] = useState(false)
  // Use a ref to hold the audio manager instance. It persists across re-renders.
  const audioManagerRef = useRef<AudioManager | null>(null)

  // Initialize AudioManager only once on the client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioManagerRef.current) {
      audioManagerRef.current = new AudioManager()
    }
  }, [])

  // Effect to synchronize React state -> AudioManager instance
  useEffect(() => {
    audioManagerRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    audioManagerRef.current?.setMuted(isMuted)
  }, [isMuted])


  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(100, newVolume)))
  }, [])

  const increaseVolume = useCallback((amount = 10) => {
    setVolumeState(prev => Math.min(100, prev + amount))
  }, [])

  const decreaseVolume = useCallback((amount = 10) => {
    setVolumeState(prev => Math.max(0, prev - amount))
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prevMuted => !prevMuted)
  }, [])


  const value = {
    volume,
    isMuted,
    setVolume,
    toggleMute,
    increaseVolume,
    decreaseVolume,
    // We expose the instance for direct use, e.g., playing sounds
    audioManager: audioManagerRef.current,
  }

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export const useAudio = (): AudioContextState => {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
