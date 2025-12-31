// File: hooks/useTimerDisplay.ts
import { TimerState } from '@/types/websocket'
import { useMemo } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * @hook useTimerDisplay
 * @description A hook to derive display properties for the timer based on its state.
 * @param {TimerState} timerData - The current state of the timer.
 * @returns {object} An object containing displayTime, phaseColor, and phaseLabel.
 */
const useTimerDisplay = (timerData: TimerState) => {
  const { currentPhase, timeRemaining, timeElapsed, mode } = timerData

  const displayState = useMemo(() => {
    let displayTime: string
    let phaseColor: string
    let phaseLabel: string

    if (currentPhase === 'PREPARE') {
      displayTime = String(timeRemaining).padStart(2, '0')
      phaseColor = '#F59E0B' // Yellow/Warning
      phaseLabel = 'GET READY'
    } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
      const mm = Math.floor(timeElapsed / 60)
      const ss = timeElapsed % 60
      displayTime = `${pad(mm)}:${pad(ss)}`
      phaseColor = '#2563EB' // Blue/Primary
      phaseLabel = 'RUNNING'
    } else if (
      mode === 'TABATA' &&
      (currentPhase === 'WORK' ||
        currentPhase === 'REST' ||
        currentPhase === 'COOLDOWN')
    ) {
      const mm = Math.floor(timeRemaining / 60)
      const ss = timeRemaining % 60
      displayTime = `${pad(mm)}:${pad(ss)}`

      switch (currentPhase) {
        case 'WORK':
          phaseColor = '#EF4444' // Red
          phaseLabel = 'WORK'
          break
        case 'REST':
          phaseColor = '#22C55E' // Green
          phaseLabel = 'REST'
          break
        default:
          phaseColor = '#3B82F6' // Blue
          phaseLabel = 'COOLDOWN'
          break
      }
    } else {
      displayTime = '00:00'
      phaseColor = '#6B7280' // Gray
      phaseLabel = 'READY'
    }
    return { displayTime, phaseColor, phaseLabel }
  }, [currentPhase, timeRemaining, timeElapsed, mode])

  return displayState
}

export default useTimerDisplay
