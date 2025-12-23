// context/AudioContext.tsx
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
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
  const [audioManager] = useState<AudioManager | null>(
    () => new AudioManager()
  )

  // Effect to synchronize React state -> AudioManager instance
  useEffect(() => {
    audioManager?.setVolume(volume)
  }, [volume, audioManager])

  useEffect(() => {
    audioManager?.setMuted(isMuted)
  }, [isMuted, audioManager])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(100, newVolume)))
  }, [])

  const increaseVolume = useCallback((amount = 10) => {
    setVolumeState((prev) => Math.min(100, prev + amount))
  }, [])

  const decreaseVolume = useCallback((amount = 10) => {
    setVolumeState((prev) => Math.max(0, prev - amount))
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prevMuted) => !prevMuted)
  }, [])

  const value = useMemo(
    () => ({
      volume,
      isMuted,
      setVolume,
      toggleMute,
      increaseVolume,
      decreaseVolume,
      audioManager,
    }),
    [
      volume,
      isMuted,
      setVolume,
      toggleMute,
      increaseVolume,
      decreaseVolume,
      audioManager,
    ]
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export const useAudio = (): AudioContextState => {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
