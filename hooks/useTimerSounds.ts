// File: hooks/useTimerSounds.ts
/**
 * A dedicated hook to manage timer sound effects globally.
 * It listens to WebSocket state for sound cues and applies user-defined volume.
 */
import { useCallback, useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import useVolumePreference from './useVolumePreference'
import { useTimer } from '@/hooks/useTimer'

export const useTimerSounds = () => {
  const timerData = useTimer()
  const { volume } = useVolumePreference()
  const lastSoundEventId = useRef<number>(0)

  // Update audio volume when volume preference changes
  useEffect(() => {
    audioManager.setVolume(volume)
  }, [volume])

  // Effect to play sound based on timer data from WebSocket
  useEffect(() => {
    // Ensure we have a new, valid sound event to play
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
          // Optional: handle unknown sound types if necessary
          break
      }
    }
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Expose a stable function to initialize audio on first user interaction.
  // useCallback ensures consumers can safely include it in dependency arrays
  // without causing unnecessary re-runs. It has no dependencies because
  // audioManager is a module singleton.
  const initializeAudio = useCallback(() => {
    audioManager.loadAudio()
  }, [])

  return { initializeAudio }
}
