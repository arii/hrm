// File: context/WorkoutSessionContext.tsx
'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { useWebSocket } from './WebSocketContext'
import { TimerCommandMessage } from '@/types/websocket'

type WorkoutStatus = 'IDLE' | 'RUNNING' | 'PAUSED'
type StartMethod = 'MANUAL' | 'AUTO' | null

interface WorkoutSessionState {
  status: WorkoutStatus
  startMethod: StartMethod
  allowAutoStart: boolean
  toggleAutoStart: () => void
  startWorkout: (method: StartMethod) => void
  stopWorkout: () => void
  pauseWorkout: () => void
  resumeWorkout: () => void
  resetWorkout: () => void
}

const WorkoutSessionContext = createContext<WorkoutSessionState | undefined>(undefined)

export const WorkoutSessionProvider = ({ children }: { children: ReactNode }) => {
  const { sendData, timerData } = useWebSocket()
  const [status, setStatus] = useState<WorkoutStatus>('IDLE')
  const [startMethod, setStartMethod] = useState<StartMethod>(null)
  const [allowAutoStart, setAllowAutoStart] = useState(true)

  // This flag will temporarily disable auto-start after a manual stop.
  const [autoStartDisabledForSession, setAutoStartDisabledForSession] = useState(false)

  // Sync with server state
  React.useEffect(() => {
    if (timerData.currentPhase === 'IDLE') {
      setStatus('IDLE');
      setStartMethod(null);
    } else if (timerData.isRunning) {
      setStatus('RUNNING');
    } else {
      // If the phase is not IDLE and the timer is not running, it's paused.
      setStatus('PAUSED');
    }
  }, [timerData.isRunning, timerData.currentPhase]);

  const toggleAutoStart = useCallback(() => {
    setAllowAutoStart((prev) => !prev)
  }, [])

  const startWorkout = useCallback(
    (method: StartMethod) => {
      if (status === 'IDLE') {
        if (
          method === 'AUTO' &&
          (!allowAutoStart || autoStartDisabledForSession)
        ) {
          console.log(
            'Auto-start prevented by user preference or manual override.'
          )
          return
        }

        console.log(`Starting workout (Method: ${method})`)
        const message: TimerCommandMessage = {
          type: 'TIMER_COMMAND',
          command: 'START',
        }
        sendData(message)
        setStartMethod(method)
        setStatus('RUNNING') // Optimistic update

        // If a manual start occurs, re-enable auto-start for the next session
        if (method === 'MANUAL') {
          setAutoStartDisabledForSession(false)
        }
      }
    },
    [status, allowAutoStart, autoStartDisabledForSession, sendData]
  )

  const stopWorkout = useCallback(() => {
    if (status === 'RUNNING' || status === 'PAUSED') {
      console.log('Stopping workout')
      const message: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'STOP',
      }
      sendData(message)
      setStatus('IDLE') // Optimistic update

      // If a workout was auto-started, disable auto-start until the next manual start
      if (startMethod === 'AUTO') {
        setAutoStartDisabledForSession(true)
      }
    }
  }, [status, startMethod, sendData])

  const pauseWorkout = useCallback(() => {
    if (status === 'RUNNING') {
      console.log('Pausing workout')
      const message: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'PAUSE',
      }
      sendData(message)
      setStatus('PAUSED') // Optimistic update
    }
  }, [status, sendData])

  const resumeWorkout = useCallback(() => {
    if (status === 'PAUSED') {
      console.log('Resuming workout')
      const message: TimerCommandMessage = {
        type: 'TIMER_COMMAND',
        command: 'START',
      } // START is used for resume
      sendData(message)
      setStatus('RUNNING') // Optimistic update
    }
  }, [status, sendData])

  const resetWorkout = useCallback(() => {
    console.log('Resetting workout state')
    sendData({ type: 'RESET_STATE' })
    setStatus('IDLE') // Optimistic update
    setStartMethod(null)
    setAutoStartDisabledForSession(false)
  }, [sendData])

  return (
    <WorkoutSessionContext.Provider
      value={{
        status,
        startMethod,
        allowAutoStart,
        toggleAutoStart,
        startWorkout,
        stopWorkout,
        pauseWorkout,
        resumeWorkout,
        resetWorkout,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  )
}

export const useWorkoutSession = () => {
  const context = useContext(WorkoutSessionContext)
  if (context === undefined) {
    throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider')
  }
  return context
}
