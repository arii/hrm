import { useEffect, useRef, useState, useCallback } from 'react'
import { audioManager } from '../utils/audioManager'
import { useWebSocket } from '@/context/WebSocketContext'

export const useAudio = () => {
  const { timerData } = useWebSocket()
  const lastSoundEventId = useRef<number>(0)
  const [isAudioContextUnlocked, setIsAudioContextUnlocked] = useState(
    audioManager.isUnlocked()
  )

  useEffect(() => {
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

  const unlockAudio = useCallback(async () => {
    const unlocked = await audioManager.unlockAudioContext()
    setIsAudioContextUnlocked(unlocked)
    return unlocked
  }, [])

  return {
    isAudioContextUnlocked,
    unlockAudio,
  }
}
