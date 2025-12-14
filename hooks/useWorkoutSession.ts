import { useState, useEffect, useRef, useCallback } from 'react'

type SessionStatus = 'idle' | 'running' | 'paused'

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
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle')

  const sessionStateRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

  const latestMetrics = useRef({
    currentHR,
    userAge,
  })

  const prevIsConnected = useRef(isConnected)

  useEffect(() => {
    latestMetrics.current = {
      currentHR,
      userAge,
    }
  }, [currentHR, userAge])

  useEffect(() => {
    const session = sessionStateRef.current
    if (prevIsConnected.current === isConnected) {
      return
    }

    if (isConnected) {
      setSessionStatus((currentStatus) => {
        if (currentStatus === 'idle') {
          session.startTime = Date.now()
          session.pauseTime = null
          session.totalPaused = 0
          return 'running'
        } else if (currentStatus === 'paused') {
          const pausedDuration = Date.now() - session.pauseTime!
          session.totalPaused += pausedDuration
          session.pauseTime = null
          return 'running'
        }
        return currentStatus
      })
    } else {
      setSessionStatus((currentStatus) => {
        if (currentStatus === 'running') {
          session.pauseTime = Date.now()
          return 'paused'
        }
        return currentStatus
      })
    }
    prevIsConnected.current = isConnected
  }, [isConnected])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const session = sessionStateRef.current

    if (sessionStatus === 'running') {
      interval = setInterval(() => {
        const { currentHR: hr, userAge: age } = latestMetrics.current
        if (session.startTime) {
          const elapsed = Date.now() - session.startTime - session.totalPaused
          setWorkoutDuration(Math.floor(elapsed / 1000))

          if (age > 0 && hr > 0) {
            const weightKg = 75
            const caloriesPerMinute =
              (age * 0.2017 - weightKg * 0.09036 + hr * 0.6309 - 55.0969) /
              4.184
            const caloriesPerSecond = caloriesPerMinute / 60
            if (caloriesPerSecond > 0) {
              setCaloriesBurned((prev) => prev + caloriesPerSecond)
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
  }, [sessionStatus])

  const resetWorkout = useCallback(() => {
    const session = sessionStateRef.current
    session.startTime = null
    session.pauseTime = null
    session.totalPaused = 0

    setSessionStatus('idle')
    setWorkoutDuration(0)
    setCaloriesBurned(0)
    prevIsConnected.current = false
  }, [])

  return {
    workoutDuration,
    caloriesBurned: Math.round(caloriesBurned),
    resetWorkout,
    hasStarted: sessionStatus !== 'idle',
  }
}
