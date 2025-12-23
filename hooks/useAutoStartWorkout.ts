// hooks/useAutoStartWorkout.ts
import { useEffect, useRef, useCallback, useState } from 'react'
import {
  WORKOUT_AUTO_START_HR_THRESHOLD_PERCENT,
  WORKOUT_AUTO_START_COOLDOWN_SECONDS,
  WORKOUT_AUTO_START_DURATION_SECONDS,
} from '@/constants/workout'

type AutoStartState = 'idle' | 'monitoring' | 'triggered'

interface AutoStartWorkoutProps {
  isAutoStartEnabled: boolean
  hrStatus: string
  percentMax: number
  workoutStatus: 'idle' | 'running' | 'paused'
  startWorkout: () => void
  onStateChange?: (state: AutoStartState) => void
}

export const useAutoStartWorkout = ({
  isAutoStartEnabled,
  hrStatus,
  percentMax,
  workoutStatus,
  startWorkout,
  onStateChange,
}: AutoStartWorkoutProps) => {
  const [autoStartState, setAutoStartState] = useState<AutoStartState>('idle')
  const highHrSince = useRef<number | null>(null)
  const lastAutoStartAttempt = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setState = useCallback(
    (newState: AutoStartState) => {
      setAutoStartState(newState)
      onStateChange?.(newState)
    },
    [onStateChange]
  )

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      highHrSince.current = null
    }

    if (
      !isAutoStartEnabled ||
      hrStatus !== 'connected' ||
      workoutStatus !== 'idle'
    ) {
      cleanup()
      if (autoStartState !== 'idle') {
        setState('idle')
      }
      return
    }

    const now = Date.now()
    const inCooldown =
      lastAutoStartAttempt.current !== null &&
      (now - lastAutoStartAttempt.current) / 1000 <
        WORKOUT_AUTO_START_COOLDOWN_SECONDS

    if (inCooldown) {
      return
    }

    if (autoStartState !== 'monitoring') {
      setState('monitoring')
    }

    const isHrHigh = percentMax >= WORKOUT_AUTO_START_HR_THRESHOLD_PERCENT

    if (isHrHigh) {
      if (highHrSince.current === null) {
        highHrSince.current = now
      } else {
        const highDurationSeconds = (now - highHrSince.current) / 1000
        if (
          highDurationSeconds >= WORKOUT_AUTO_START_DURATION_SECONDS &&
          autoStartState !== 'triggered'
        ) {
          setState('triggered')
          lastAutoStartAttempt.current = now
          timeoutId = setTimeout(() => {
            startWorkout()
            setState('idle')
          }, 0)
        }
      }
    } else {
      highHrSince.current = null
    }

    return cleanup
  }, [
    isAutoStartEnabled,
    hrStatus,
    percentMax,
    workoutStatus,
    startWorkout,
    setState,
    autoStartState,
  ])

  const cancelAutoStart = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setState('idle')
    highHrSince.current = null
  }, [setState])

  return { cancelAutoStart, autoStartState }
}
