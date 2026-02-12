import { useEffect, useReducer, useCallback, useMemo } from 'react'
import { WorkoutStatus } from '@/types/workout'

const STORAGE_KEY = 'hrm_active_session'

interface SessionState {
  status: WorkoutStatus
  duration: number
  totalCalories: number
  startCalories: number
  startTime: number | null
  pauseTime: number | null
  totalPaused: number
  isRehydrated: boolean
}

const getInitialState = (): SessionState => ({
  status: 'idle',
  duration: 0,
  totalCalories: 0,
  startCalories: 0,
  startTime: null,
  pauseTime: null,
  totalPaused: 0,
  isRehydrated: false,
})

const loadState = (): Partial<SessionState> => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.status) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to load session state', e)
  }
  return {}
}

type SessionAction =
  | { type: 'REHYDRATE'; payload: Partial<SessionState> }
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | {
      type: 'START_WORKOUT'
      payload: { startTime: number; startCalories: number }
    }
  | { type: 'PAUSE_WORKOUT'; payload: { pauseTime: number } }
  | { type: 'RESUME_WORKOUT'; payload: { resumeTime: number } }
  | { type: 'END_WORKOUT' }
  | { type: 'UPDATE_TOTAL_CALORIES'; payload: number }

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'REHYDRATE':
      return { ...state, ...action.payload, isRehydrated: true }

    case 'START_WORKOUT': {
      // Per audit feedback: dispatcher handles status check,
      // so this logic is strictly for fresh starts.
      return {
        ...state,
        status: 'running',
        startTime: action.payload.startTime,
        startCalories: action.payload.startCalories,
        totalCalories: Math.max(
          state.totalCalories,
          action.payload.startCalories
        ),
        pauseTime: null,
      }
    }

    case 'PAUSE_WORKOUT':
      if (state.status !== 'running') return state
      return {
        ...state,
        status: 'paused',
        pauseTime: action.payload.pauseTime,
      }

    case 'RESUME_WORKOUT':
      if (state.status !== 'paused' || !state.pauseTime) return state
      return {
        ...state,
        status: 'running',
        totalPaused:
          state.totalPaused + (action.payload.resumeTime - state.pauseTime),
        pauseTime: null,
      }

    case 'END_WORKOUT':
        return { ...state, status: 'idle' }

    case 'TICK':
      return { ...state, duration: action.payload.duration }

    case 'UPDATE_TOTAL_CALORIES':
        if (state.status === 'idle') return state
      return { ...state, totalCalories: action.payload }

    case 'RESET':
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY)
      }
      return { ...getInitialState(), isRehydrated: true }

    default:
      return state
  }
}

interface WorkoutSessionOptions {
  isConnected: boolean
  totalCalories?: number
}

export const useWorkoutSession = ({
  totalCalories = 0,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, getInitialState())

  const {
    status,
    startTime,
    pauseTime,
    totalPaused,
    totalCalories: savedTotal,
    startCalories,
    isRehydrated,
    duration,
  } = state

  useEffect(() => {
    const saved = loadState()
    dispatch({ type: 'REHYDRATE', payload: saved })
  }, [])

  useEffect(() => {
    if (!isRehydrated || typeof window === 'undefined') return

    if (status === 'idle' && startTime === null) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          status,
          startTime,
          pauseTime,
          totalPaused,
          totalCalories: savedTotal,
          startCalories,
        })
      )
    }
  }, [
    status,
    startTime,
    pauseTime,
    totalPaused,
    savedTotal,
    startCalories,
    isRehydrated,
  ])

  useEffect(() => {
    if (status !== 'running' || !startTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedMs = now - startTime - totalPaused
      const durationSec = Math.max(0, Math.floor(elapsedMs / 1000))
      dispatch({ type: 'TICK', payload: { duration: durationSec } })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, startTime, totalPaused])

  useEffect(() => {
    if (totalCalories > 0 && status !== 'idle') {
      dispatch({ type: 'UPDATE_TOTAL_CALORIES', payload: totalCalories })
    }
  }, [totalCalories, status])

  const startWorkout = useCallback(() => {
    dispatch({
      type: 'START_WORKOUT',
      payload: { startTime: Date.now(), startCalories: totalCalories },
    })
  }, [totalCalories])

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE_WORKOUT', payload: { pauseTime: Date.now() } })
  }, [])

  const resumeWorkout = useCallback(() => {
    dispatch({ type: 'RESUME_WORKOUT', payload: { resumeTime: Date.now() } })
  }, [])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END_WORKOUT' })
  }, [])

  const resetWorkout = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const caloriesBurned = useMemo(() => {
    if (startTime === null || (status === 'idle' && duration === 0)) return 0
    const currentTotal = Math.max(totalCalories, savedTotal)
    const burned = Math.round(currentTotal - startCalories)
    return burned > 0 ? burned : 0
  }, [totalCalories, savedTotal, startCalories, status, startTime, duration])

  return {
    workoutDuration: duration,
    caloriesBurned,
    startTime,
    resetWorkout,
    startWorkout: status === 'paused' ? resumeWorkout : startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus: status,
    hasStarted: startTime !== null,
    isRehydrated,
  }
}
