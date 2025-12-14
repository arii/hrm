import { useState, useEffect, useRef, useCallback } from 'react'

interface WorkoutSessionOptions {
  isConnected: boolean
  currentHR: number
  userAge: number
}

export const useWorkoutSession = ({
  isConnected,
  currentHR,
  userAge,
}: WorkoutSessionOptions) => {
  const [workoutDuration, setWorkoutDuration] = useState(0)
  const [caloriesBurned, setCaloriesBurned] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  // Ref to hold session timing data to avoid dependency cycles in effects.
  const sessionStateRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

  // Ref to hold latest metrics for use in the interval without causing re-renders.
  const latestMetrics = useRef({
    currentHR,
    userAge,
  })

  useEffect(() => {
    latestMetrics.current = {
      currentHR,
      userAge,
    }
  }, [currentHR, userAge])

  // Effect to manage the session's running state based on connection status.
  const [isPaused, setIsPaused] = useState(true)
  useEffect(() => {
    const session = sessionStateRef.current

    if (isConnected) {
      // Transitioning to a connected state
      if (!session.startTime) {
        // This is the very first connection. Start the session.
        session.startTime = Date.now()
        session.pauseTime = null
        session.totalPaused = 0
        setHasStarted(true) // Signal that the session has begun
        setIsPaused(false) // Start the timer
      } else if (session.pauseTime) {
        // Resuming from a paused state.
        const pausedDuration = Date.now() - session.pauseTime
        session.totalPaused += pausedDuration
        session.pauseTime = null
        setIsPaused(false) // Resume the timer
      }
    } else {
      // Transitioning to a disconnected state
      if (session.startTime && !session.pauseTime) {
        // The session was running, so pause it.
        session.pauseTime = Date.now()
        setIsPaused(true) // Pause the timer
      }
    }
  }, [isConnected])

  // Effect for the main workout timer and calorie calculation.
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const session = sessionStateRef.current

    if (session.startTime && !isPaused) {
      interval = setInterval(() => {
        const { currentHR: hr, userAge: age } = latestMetrics.current

        const elapsed = Date.now() - session.startTime! - session.totalPaused
        setWorkoutDuration(Math.floor(elapsed / 1000))

        if (age > 0 && hr > 0) {
          const weightKg = 75 // Assuming a constant weight
          const caloriesPerMinute =
            (age * 0.2017 - weightKg * 0.09036 + hr * 0.6309 - 55.0969) / 4.184
          const caloriesPerSecond = caloriesPerMinute / 60
          if (caloriesPerSecond > 0) {
            setCaloriesBurned((prev) => prev + caloriesPerSecond)
          }
        }
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPaused]) // This effect now only depends on the paused state.

  const resetWorkout = useCallback(() => {
    const session = sessionStateRef.current
    session.startTime = null
    session.pauseTime = null
    session.totalPaused = 0

    setHasStarted(false)
    setIsPaused(true)
    setWorkoutDuration(0)
    setCaloriesBurned(0)
  }, [])

  return {
    workoutDuration,
    caloriesBurned: Math.round(caloriesBurned),
    resetWorkout,
    hasStarted,
  }
}
