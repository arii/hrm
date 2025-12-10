/**
 * Audio hook for handling timer sound effects based on phase transitions.
 */
import { useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'
import { TimerData, TimerPhase } from '../types/websocket'

export const useAudio = (timerData: TimerData, volume?: number) => {
  const previousPhaseRef = useRef<TimerPhase>('IDLE')
  const lastCountdownBeepRef = useRef<number>(0)

  // Update audio volume when the preference changes
  useEffect(() => {
    if (volume !== undefined) {
      audioManager.setVolume(volume)
    }
  }, [volume])

  // Effect to play sounds based on timer state changes
  useEffect(() => {
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
  }, [timerData]) // Rerun whenever timer data changes

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
