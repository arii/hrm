import { useState, useEffect, useRef } from 'react'

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
  const [workoutDuration, setWorkoutDuration] = useState(0)
  const [caloriesBurned, setCaloriesBurned] = useState(0)

  const latestMetrics = useRef({
    currentHR,
    userAge,
    sessionStartTime,
  })

  useEffect(() => {
    latestMetrics.current = {
      currentHR,
      userAge,
      sessionStartTime,
    }
  }, [currentHR, userAge, sessionStartTime])

  const prevIsConnected = useRef(isConnected)

  useEffect(() => {
    if (isConnected && !prevIsConnected.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionStartTime(Date.now())
      setWorkoutDuration(0)
      setCaloriesBurned(0)
    }
    prevIsConnected.current = isConnected
  }, [isConnected])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        const {
          currentHR: hr,
          userAge: age,
          sessionStartTime: start,
        } = latestMetrics.current

        if (start) {
          const durationInSeconds = Math.floor((Date.now() - start) / 1000)
          setWorkoutDuration(durationInSeconds)

          if (age > 0 && hr > 0) {
            const weightKg = 75
            const caloriesPerMinute =
              (age * 0.2017 - weightKg * 0.09036 + hr * 0.6309 - 55.0969) /
              4.184
            const caloriesPerSecond = caloriesPerMinute / 60
            if (caloriesPerSecond > 0) {
              setCaloriesBurned(
                (prevCalories) => prevCalories + caloriesPerSecond
              )
            }
          }
        }
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isConnected, sessionStartTime])

  return {
    workoutDuration,
    caloriesBurned: Math.round(caloriesBurned),
  }
}
