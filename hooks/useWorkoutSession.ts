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
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [sessionPauseTime, setSessionPauseTime] = useState<number | null>(null)
  const [totalPausedTime, setTotalPausedTime] = useState(0)
  const [workoutDuration, setWorkoutDuration] = useState(0)
  const [caloriesBurned, setCaloriesBurned] = useState(0)

  // To keep interval calculations accurate with latest state without restarting the interval
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

  // Effect to handle connection status changes (start, pause, resume)
  useEffect(() => {
    if (isConnected) {
      if (!sessionStartTime) {
        // First-time connection, start the session
        setSessionStartTime(Date.now())
        setTotalPausedTime(0)
        setSessionPauseTime(null)
      } else if (sessionPauseTime) {
        // Resuming from a paused state
        const pausedDuration = Date.now() - sessionPauseTime
        setTotalPausedTime((prev) => prev + pausedDuration)
        setSessionPauseTime(null)
      }
    } else {
      if (sessionStartTime && !sessionPauseTime) {
        // Connection lost, pause the session
        setSessionPauseTime(Date.now())
      }
    }
  }, [isConnected, sessionStartTime, sessionPauseTime])

  // Effect for the main workout timer and calorie calculation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (sessionStartTime && !sessionPauseTime) {
      interval = setInterval(() => {
        const { currentHR: hr, userAge: age } = latestMetrics.current

        // Calculate total elapsed duration
        const elapsed = Date.now() - sessionStartTime - totalPausedTime
        setWorkoutDuration(Math.floor(elapsed / 1000))

        // Calculate calories burned since the last tick (1 second)
        if (age > 0 && hr > 0) {
          const weightKg = 75 // Assuming a constant weight for now
          // Formula for calories burned per minute
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
  }, [sessionStartTime, sessionPauseTime, totalPausedTime])

  const resetWorkout = useCallback(() => {
    setSessionStartTime(null)
    setSessionPauseTime(null)
    setTotalPausedTime(0)
    setWorkoutDuration(0)
    setCaloriesBurned(0)
  }, [])

  return {
    workoutDuration,
    caloriesBurned: Math.round(caloriesBurned),
    resetWorkout,
    hasStarted: sessionStartTime !== null,
  }
}
