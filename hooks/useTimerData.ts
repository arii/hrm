// File: hooks/useTimerData.ts
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo } from 'react'

/**
 * @description A hook to extract memoized Timer data from the WebSocket context.
 * This hook ensures that consumers only re-render when the specific timerData values change.
 * @returns {object} An object containing the timer data.
 */
export const useTimerData = () => {
  const { timerData } = useWebSocket()

  const memoizedTimerData = useMemo(() => {
    return {
      phase: timerData.phase,
      timeRemaining: timerData.timeRemaining,
      timeElapsed: timerData.timeElapsed,
      mode: timerData.mode,
      workDuration: timerData.workDuration,
      restDuration: timerData.restDuration,
    }
  }, [
    timerData.phase,
    timerData.timeRemaining,
    timerData.timeElapsed,
    timerData.mode,
    timerData.workDuration,
    timerData.restDuration,
  ])

  return memoizedTimerData
}
