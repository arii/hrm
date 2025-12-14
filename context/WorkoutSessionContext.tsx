// File: context/WorkoutSessionContext.tsx
'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { useWebSocket } from './WebSocketContext'
import { TimerCommandMessage } from '@/types/websocket'

type WorkoutStatus = 'IDLE' | 'RUNNING'
type StartMethod = 'MANUAL' | 'AUTO' | null

interface WorkoutSessionState {
  status: WorkoutStatus
  startMethod: StartMethod
  allowAutoStart: boolean
  toggleAutoStart: () => void
  startWorkout: (method: StartMethod) => void
  stopWorkout: () => void
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
    setStatus(timerData.isRunning ? 'RUNNING' : 'IDLE')
    if (!timerData.isRunning) {
      setStartMethod(null) // Reset start method when timer stops
    }
  }, [timerData.isRunning])

  const toggleAutoStart = useCallback(() => {
    setAllowAutoStart(prev => !prev)
  }, [])

  const startWorkout = useCallback((method: StartMethod) => {
    if (status === 'IDLE') {
      if (method === 'AUTO' && (!allowAutoStart || autoStartDisabledForSession)) {
        console.log('Auto-start prevented by user preference or manual override.')
        return
      }

      console.log(`Starting workout (Method: ${method})`)
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command: 'START' }
      sendData(message)
      setStartMethod(method)
      setStatus('RUNNING') // Optimistic update

      // If a manual start occurs, re-enable auto-start for the next session
      if (method === 'MANUAL') {
        setAutoStartDisabledForSession(false)
      }
    }
  }, [status, allowAutoStart, autoStartDisabledForSession, sendData])

  const stopWorkout = useCallback(() => {
    if (status === 'RUNNING') {
      console.log('Stopping workout')
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command: 'STOP' }
      sendData(message)
      setStatus('IDLE') // Optimistic update

      // If a workout was auto-started, disable auto-start until the next manual start
      if (startMethod === 'AUTO') {
        setAutoStartDisabledForSession(true)
      }
    }
  }, [status, startMethod, sendData])

  return (
    <WorkoutSessionContext.Provider value={{ status, startMethod, allowAutoStart, toggleAutoStart, startWorkout, stopWorkout }}>
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
