import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'

export const useAudio = () => {
  const { timerData } = useWebSocket()
  const lastSoundEventId = useRef<number>(0)

  useEffect(() => {
    // Only play sound if we have a new sound event
    if (
      timerData.soundToPlay &&
      timerData.soundEventId &&
      timerData.soundEventId !== lastSoundEventId.current
    ) {
      logger.debug(
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
          logger.warn(`[useAudio] Unknown sound type: ${timerData.soundToPlay}`)
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    logger.debug('[useAudio] initializeAudio called')
    audioManager.loadAudio()
  }

  return {
    initializeAudio,
  }
}
