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
  const [workoutState, setWorkoutState] = useState<WorkoutState>({
    isWorkoutActive: false,
    startTime: null,
    endTime: null,
    duration: 0,
  })

  useEffect(() => {
    if (workoutData) {
      setWorkoutState(workoutData)
    }
  }, [workoutData])

  // Start Workout Function
  const startWorkout = useCallback(() => {
    const now = Date.now()
    const newState = {
      isWorkoutActive: true,
      startTime: now,
      endTime: null,
      duration: 0,
    }
    setWorkoutState(newState)
    sendData({ type: 'WORKOUT_COMMAND', payload: { action: 'START', state: newState } })
  }, [sendData])

  // End Workout Function
  const endWorkout = useCallback(() => {
    if (workoutState.startTime) {
      const now = Date.now()
      const duration = Math.round((now - workoutState.startTime) / 1000)
      const newState = {
        ...workoutState,
        isWorkoutActive: false,
        endTime: now,
        duration,
      }
      setWorkoutState(newState)
      sendData({ type: 'WORKOUT_COMMAND', payload: { action: 'END', state: newState } })
    }
  }, [workoutState, sendData])

  // Effect to update duration for active workouts
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (workoutState.isWorkoutActive && workoutState.startTime) {
      interval = setInterval(() => {
        const duration = Math.round((Date.now() - workoutState.startTime!) / 1000)
        setWorkoutState((prevState) => ({ ...prevState, duration }))
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [workoutState.isWorkoutActive, workoutState.startTime])

  const value = {
    workoutState,
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
