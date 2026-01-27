import { useCallback, useEffect, useRef } from 'react'
import { useWorkoutState } from './useWorkoutState'
import { useWorkoutData } from './useWorkoutData'

// --- The Hook Implementation ---

interface WorkoutSessionOptions {
  isConnected: boolean
  totalCalories: number
}

export const useWorkoutSession = ({
  isConnected,
  totalCalories,
}: WorkoutSessionOptions) => {
  const {
    workoutStatus,
    startWorkout: startState,
    pauseWorkout: pauseState,
    endWorkout: endState,
    resetWorkout: resetState,
    connect,
    disconnect,
  } = useWorkoutState()

  const {
    workoutDuration,
    caloriesBurned,
    resetWorkoutData,
    startWorkoutData,
  } = useWorkoutData({
    workoutStatus,
    totalCalories,
  })

  const prevIsConnected = useRef(isConnected)
  useEffect(() => {
    if (prevIsConnected.current !== isConnected) {
      if (isConnected) {
        connect()
      } else {
        disconnect()
      }
      prevIsConnected.current = isConnected
    }
  }, [isConnected, connect, disconnect])

  const startWorkout = useCallback(() => {
    startState()
    startWorkoutData()
  }, [startState, startWorkoutData])

  const pauseWorkout = useCallback(() => {
    pauseState()
  }, [pauseState])

  const endWorkout = useCallback(() => {
    endState()
  }, [endState])

  const resetWorkout = useCallback(() => {
    resetState()
    resetWorkoutData()
  }, [resetState, resetWorkoutData])

  return {
    workoutDuration,
    caloriesBurned,
    resetWorkout,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus,
    hasStarted: workoutStatus !== 'idle',
  }
}
