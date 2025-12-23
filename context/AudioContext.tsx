// context/AudioContext.tsx
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from 'react'
import { AudioManager } from '@/utils/audioManager'
import { clampVolume } from '@/utils/volume'

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
  const audioManagerRef = useRef<AudioManager | null>(null)
  const [audioManager, setAudioManager] = useState<AudioManager | null>(null)

  // Initialize AudioManager only once on the client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioManagerRef.current) {
      audioManagerRef.current = new AudioManager()
      setAudioManager(audioManagerRef.current)
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
    setVolumeState(clampVolume(newVolume))
  }, [])

  const increaseVolume = useCallback((amount = 10) => {
    setVolumeState((prev) => clampVolume(prev + amount))
  }, [])

  const decreaseVolume = useCallback((amount = 10) => {
    setVolumeState((prev) => clampVolume(prev - amount))
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
