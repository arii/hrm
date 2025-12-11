import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import { TimerData } from '../types/websocket'

export const useAudio = (timerData: TimerData) => {
  const lastSoundEventId = useRef<number>(0)

  useEffect(() => {
    // Only play sound if we have a new sound event
    if (
      timerData.soundToPlay &&
      timerData.soundEventId &&
      timerData.soundEventId !== lastSoundEventId.current
    ) {
      lastSoundEventId.current = timerData.soundEventId

      switch (timerData.soundToPlay) {
        case 'COUNTDOWN':
          audioManager.playShort() // Will respect isMuted internally
          break
        case 'WORK':
        case 'REST':
          audioManager.playLong() // Will respect isMuted internally
          break
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    audioManager.loadAudio()
  }

  return {
    initializeAudio,
  }
}
