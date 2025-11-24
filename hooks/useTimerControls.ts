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
  const latestWorkRef = useRef<number>(workTime)
  const latestRestRef = useRef<number>(restTime)

  useEffect(() => {
    latestWorkRef.current = workTime
  }, [workTime])

  useEffect(() => {
    latestRestRef.current = restTime
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
          workDuration: latestWorkRef.current,
          restDuration: latestRestRef.current,
        }
        sendData(config)
      }
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)
    },
    [sendData, latestWorkRef, latestRestRef]
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
    latestWorkRef,
    latestRestRef,
    sendTimerCommand,
    sendModeCommand,
  }
}
