'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo } from 'react'
import { TimerData } from '@/types/websocket'

export const useTimerData = (): TimerData => {
  const { timerData } = useWebSocket()
  const {
    isRunning,
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration,
    restDuration,
    soundEventId,
  } = timerData

  return useMemo(
    () => ({
      isRunning,
      currentPhase,
      timeRemaining,
      timeElapsed,
      mode,
      workDuration,
      restDuration,
      soundEventId,
    }),
    [
      isRunning,
      currentPhase,
      timeRemaining,
      timeElapsed,
      mode,
      workDuration,
      restDuration,
      soundEventId,
    ]
  )
}
