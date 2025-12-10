// File: hooks/useTimerSounds.ts
/**
 * A dedicated hook to manage timer sound effects globally.
 * It listens to WebSocket state for phase transitions and applies user-defined volume.
 */
import { useCallback, useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import useVolumePreference from './useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { TimerPhase } from '@/types/websocket'

export const useTimerSounds = (isMuted: boolean = false) => {
  const { timerData } = useWebSocket()
  const { volume } = useVolumePreference()
  const previousPhaseRef = useRef<TimerPhase>('IDLE')
  const lastCountdownBeepRef = useRef<number>(0)

  // Update audio volume when volume preference changes
  useEffect(() => {
    audioManager.setVolume(volume)
  }, [volume])

  // Effect to play sound based on timer data from WebSocket
  useEffect(() => {
    if (isMuted) return

    const currentPhase = timerData.currentPhase
    const previousPhase = previousPhaseRef.current
    const timeRemaining = timerData.timeRemaining

    // 1. On phase change, play a long notification sound
    if (currentPhase !== previousPhase) {
      switch (currentPhase) {
        case 'WORK':
        case 'REST':
          audioManager.playLong()
          break
        case 'PREPARE':
          // Reset countdown beep tracking when we enter PREPARE
          lastCountdownBeepRef.current = 0
          // Also play a long beep to signal the start of the prepare phase
          audioManager.playLong()
          break
      }
    }

    // 2. During PREPARE phase, play short countdown beeps for the last 3 seconds
    if (
      currentPhase === 'PREPARE' &&
      timeRemaining > 0 &&
      timeRemaining <= 3
    ) {
      // Play short beep only once for each remaining second
      if (lastCountdownBeepRef.current !== timeRemaining) {
        audioManager.playShort()
        lastCountdownBeepRef.current = timeRemaining
      }
    }

    // 3. Update the previous phase ref for the next render
    previousPhaseRef.current = currentPhase
  }, [timerData, isMuted])

  // Expose a stable function to initialize audio on first user interaction.
  const initializeAudio = useCallback(() => {
    audioManager.loadAudio()
  }, [])

  return { initializeAudio }
}
