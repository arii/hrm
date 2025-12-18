import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import { useWebSocket } from '@/context/WebSocketContext'

// --- Constants ---
const TIMER_BEEP_VOLUME_TO_SPOTIFY_RATIO = 1.5 // Make beeps 50% louder than Spotify

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

  useEffect(() => {
    if (typeof timerData.spotifyVolume === 'number') {
      const spotifyVolume = timerData.spotifyVolume / 100 // Convert to 0-1 scale
      const adjustedBeepVolume = Math.min(
        1,
        spotifyVolume * TIMER_BEEP_VOLUME_TO_SPOTIFY_RATIO
      )
      console.log(
        `[useAudio] Spotify volume changed: ${spotifyVolume.toFixed(
          2
        )}. Setting beep volume to: ${adjustedBeepVolume.toFixed(2)}`
      )
      audioManager.setVolume(adjustedBeepVolume * 100) // Convert back to 0-100
    }
  }, [timerData.spotifyVolume])

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    console.log('[useAudio] initializeAudio called')
    audioManager.loadAudio()
  }

  return {
    initializeAudio,
  }
}
