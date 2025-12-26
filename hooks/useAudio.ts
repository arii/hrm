// hooks/useAudio.ts
'use client'
import { useEffect, useRef, useState } from 'react'
import { audioManager } from '../utils/audioManager'
import { useWebSocket } from '@/context/WebSocketContext'

export const useAudio = () => {
  const { timerData } = useWebSocket()
  const lastSoundEventId = useRef<number>(0)
  const [isAudioContextUnlocked, setIsAudioContextUnlocked] = useState(
    audioManager.isAudioContextUnlocked
  )

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
          audioManager.playShort()
          break
        case 'WORK':
        case 'REST':
          audioManager.playLong()
          break
        default:
          console.warn(
            `[useAudio] Unknown sound type: ${timerData.soundToPlay}`
          )
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  const unlockAudio = () => {
    audioManager.unlockAudioContext()
    setIsAudioContextUnlocked(true)
  }

  return {
    isAudioContextUnlocked,
    unlockAudio,
  }
}
