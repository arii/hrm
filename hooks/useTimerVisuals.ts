// hooks/useTimerVisuals.ts
'use client'
import { useMemo } from 'react'
import { TimerData } from '@/types/websocket'
import { useTheme } from '@mui/material/styles'

const pad = (n: number) => String(n).padStart(2, '0')

export const useTimerVisuals = (timerData: TimerData) => {
  const theme = useTheme()
  const { currentPhase, timeRemaining, timeElapsed, mode } = timerData

  const visuals = useMemo(() => {
    let displayTime: string
    let phaseColor: string
    let phaseLabel: string

    if (currentPhase === 'PREPARE') {
      displayTime = String(timeRemaining).padStart(2, '0')
      phaseColor = theme.palette.timer.prepare
      phaseLabel = 'GET READY'
    } else if (mode === 'STOPWATCH' && currentPhase === 'RUNNING') {
      const mm = Math.floor(timeElapsed / 60)
      const ss = timeElapsed % 60
      displayTime = `${pad(mm)}:${pad(ss)}`
      phaseColor = theme.palette.timer.running
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
        phaseColor = theme.palette.timer.work
        phaseLabel = 'WORK'
      } else if (currentPhase === 'REST') {
        phaseColor = theme.palette.timer.rest
        phaseLabel = 'REST'
      } else {
        phaseColor = theme.palette.timer.cooldown
        phaseLabel = 'COOLDOWN'
      }
    } else {
      displayTime = '00:00'
      phaseColor = theme.palette.timer.idle
      phaseLabel = 'READY'
    }

    return { displayTime, phaseColor, phaseLabel }
  }, [currentPhase, timeRemaining, timeElapsed, mode, theme])

  return visuals
}
