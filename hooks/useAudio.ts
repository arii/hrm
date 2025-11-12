/**
 * Audio hook for handling timer sound effects
 */
import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import { TimerData } from '../types/websocket'

export const useAudio = (timerData: TimerData, volume?: number) => {
  const lastSoundEventId = useRef<number>(0)

  // Update audio volume when volume changes
  useEffect(() => {
    if (volume !== undefined) {
      audioManager.setVolume(volume)
    }
  }, [volume])

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
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    audioManager.loadAudio()
  }

  return {
    initializeAudio,
    setVolume: audioManager.setVolume.bind(audioManager),
    toggleMute: audioManager.toggleMute.bind(audioManager),
    setMuted: audioManager.setMuted.bind(audioManager),
    getMuted: audioManager.getMuted.bind(audioManager),
  }
}
