import { useEffect, useRef, useState, useCallback } from 'react'
import { audioManager } from '../utils/audioManager'
import { useWebSocket } from '@/context/WebSocketContext'

export const useAudio = () => {
  const { timerData } = useWebSocket()
  const lastSoundEventId = useRef<number>(0)
  const [isAudioContextUnlocked, setIsAudioContextUnlocked] = useState(
    audioManager.isAudioContextUnlocked()
  )

  useEffect(() => {
    // Only play sound if we have a new sound event
    if (
      timerData.soundToPlay &&
      timerData.soundEventId &&
      timerData.soundEventId !== lastSoundEventId.current
    ) {
      console.log(
        `[useAudio] Triggering sound: ${timerData.soundToPlay} (Event ID: ${timerData.soundEventId})`
      )
      lastSoundEventId.current = timerData.soundEventId

      switch (timerData.soundToPlay) {
        case 'COUNTDOWN':
          audioManager.playShort() // Will respect isMuted internally
          break
        case 'WORK':
        case 'REST':
          audioManager.playLong() // Will respect isMuted internally
          break
        default:
          console.warn(
            `[useAudio] Unknown sound type: ${timerData.soundToPlay}`
          )
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    console.log('[useAudio] initializeAudio called')
    audioManager.loadAudio()
    setIsAudioContextUnlocked(audioManager.isAudioContextUnlocked())
  }, [])

  return {
    initializeAudio,
    isAudioContextUnlocked,
  }
}
