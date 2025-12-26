// hooks/useTimerVisuals.ts
import { useMemo } from 'react'
import { TimerData } from '@/types/websocket'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Custom hook to derive visual properties from timer data.
 * @param timerData The timer data from the WebSocket context.
 * @returns An object with displayTime, phaseColor, and phaseLabel.
 */
export function useTimerVisuals(timerData: TimerData) {
  const { currentPhase, timeRemaining, timeElapsed, mode } = timerData

  const visuals = useMemo(() => {
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

      if (currentPhase === 'WORK') {
        phaseColor = '#EF4444' // Red
        phaseLabel = 'WORK'
      } else if (currentPhase === 'REST') {
        phaseColor = '#22C55E' // Green
        phaseLabel = 'REST'
      } else {
        phaseColor = '#3B82F6' // Blue
        phaseLabel = 'COOLDOWN'
      }
    } else {
      displayTime = '00:00'
      phaseColor = '#6B7280' // Gray
      phaseLabel = 'READY'
    }

    return { displayTime, phaseColor, phaseLabel }
  }, [currentPhase, timeRemaining, timeElapsed, mode])

  return visuals
}
