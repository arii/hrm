/**
 * Audio hook for handling timer sound effects
 */
import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import { TimerData } from '../types/websocket'
import useVolumePreference from './useVolumePreference' // Import the hook

export const useAudio = (timerData: TimerData) => { // Remove volume prop
  const lastSoundEventId = useRef<number>(0)
  const { volume } = useVolumePreference() // Get volume from the single source of truth

  // Update audio volume when volume changes
  useEffect(() => {
    audioManager.setVolume(volume)
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
