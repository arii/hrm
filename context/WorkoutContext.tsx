// context/WorkoutContext.tsx
'use client'

import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { useWebSocket } from './WebSocketContext'

// 1. Define the state shape
export interface WorkoutState {
  isWorkoutActive: boolean
  startTime: number | null
  endTime: number | null
  duration: number // in seconds
}

// 2. Define the context shape
interface WorkoutContextType {
  workoutState: WorkoutState
  startWorkout: () => void
  endWorkout: () => void
}

// 3. Create the context
const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

// 4. Create the provider component
export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const { sendData, workoutData } = useWebSocket()
  const workoutState = workoutData
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const duration = workoutState.isWorkoutActive
    ? Math.round((now - (workoutState.startTime || now)) / 1000)
    : workoutState.duration

  // Start Workout Function
  const startWorkout = useCallback(() => {
    const now = Date.now()
    const newState: WorkoutState = {
      isWorkoutActive: true,
      startTime: now,
      endTime: null,
      duration: 0,
    }
    sendData({
      type: 'WORKOUT_COMMAND',
      payload: { action: 'START', state: newState },
    })
  }, [sendData])

  // End Workout Function
  const endWorkout = useCallback(() => {
    if (workoutState.startTime) {
      const now = Date.now()
      const duration = Math.round((now - workoutState.startTime) / 1000)
      const newState: WorkoutState = {
        ...workoutState,
        isWorkoutActive: false,
        endTime: now,
        duration,
      }
      sendData({
        type: 'WORKOUT_COMMAND',
        payload: { action: 'END', state: newState },
      })
    }
  }, [workoutState, sendData])

  const value = {
    workoutState: {
      ...workoutState,
      duration,
    },
    startWorkout,
    endWorkout,
  }

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  )
}

// 5. Create the custom hook
export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}
