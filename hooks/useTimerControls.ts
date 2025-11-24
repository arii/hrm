// File: hooks/useTimerControls.ts
import { useWebSocket } from '@/context/WebSocketContext'
import {
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
} from '@/types/websocket'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from './useDebounce'

export const useTimerControls = () => {
  const { timerData, sendData } = useWebSocket()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)
  const latestWork = useRef<number>(workTime)
  const latestRest = useRef<number>(restTime)

  useEffect(() => {
    latestWork.current = workTime
  }, [workTime])

  useEffect(() => {
    latestRest.current = restTime
  }, [restTime])

  useEffect(() => {
    const message: TimerConfigMessage = {
      type: 'TIMER_CONFIG',
      workDuration: debouncedWorkTime,
      restDuration: debouncedRestTime,
    }
    sendData(message)
  }, [debouncedWorkTime, debouncedRestTime, sendData])

  const sendTimerCommand = useCallback(
    (command: 'START' | 'PAUSE' | 'STOP') => {
      if (command === 'START') {
        const config: TimerConfigMessage = {
          type: 'TIMER_CONFIG',
          workDuration: latestWork.current,
          restDuration: latestRest.current,
        }
        sendData(config)
      }
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)
    },
    [sendData, latestWork, latestRest]
  )

  const sendModeCommand = (mode: 'TABATA' | 'STOPWATCH') => {
    const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
    sendData(message)
  }

  return {
    timerData,
    workTime,
    setWorkTime,
    restTime,
    setRestTime,
    latestWork,
    latestRest,
    sendTimerCommand,
    sendModeCommand,
  }
}
