import { useEffect, useReducer, useCallback, useMemo, useState } from 'react'

const STORAGE_KEY = 'hrm_active_session'

// --- State Definitions ---
type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
  startTime: number | null
  pauseTime: number | null
  totalPaused: number
}

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
  startTime: null,
  pauseTime: null,
  totalPaused: 0,
}

// --- Helper to load from storage ---
const loadState = (): SessionState => {
  if (typeof window === 'undefined') return initialState
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.status && typeof parsed.duration === 'number') {
        return {
          ...initialState,
          ...parsed,
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load session state', e)
  }
  return initialState
}

type SessionAction =
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT'; payload: { startTime: number } }
  | { type: 'PAUSE_WORKOUT'; payload: { pauseTime: number } }
  | { type: 'RESUME_WORKOUT'; payload: { resumeTime: number } }
  | { type: 'END_WORKOUT' }
  | { type: 'UPDATE_CALORIES'; payload: number }

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'START_WORKOUT':
      if (state.status === 'idle') {
        return {
          ...state,
          status: 'running',
          duration: 0,
          startTime: action.payload.startTime,
          pauseTime: null,
          totalPaused: 0,
        }
      } else if (state.status === 'paused') {
        const addedPaused = state.pauseTime
          ? action.payload.startTime - state.pauseTime
          : 0
        return {
          ...state,
          status: 'running',
          pauseTime: null,
          totalPaused: state.totalPaused + addedPaused,
        }
      }
      return state
    case 'PAUSE_WORKOUT':
      if (state.status === 'running') {
        return {
          ...state,
          status: 'paused',
          pauseTime: action.payload.pauseTime,
        }
      }
      return state
    case 'RESUME_WORKOUT':
      if (state.status === 'paused') {
        const addedPaused = state.pauseTime
          ? action.payload.resumeTime - state.pauseTime
          : 0
        return {
          ...state,
          status: 'running',
          pauseTime: null,
          totalPaused: state.totalPaused + addedPaused,
        }
      }
      return state
    case 'END_WORKOUT':
      return { ...state, status: 'idle', pauseTime: null }
    case 'TICK':
      return { ...state, duration: action.payload.duration }
    case 'UPDATE_CALORIES':
      return { ...state, calories: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface WorkoutSessionOptions {
  totalCalories?: number
}

export const useWorkoutSession = ({
  totalCalories = 0,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState, loadState)
  const [startCalories, setStartCalories] = useState(0)

  // Move persistence side effects to useEffect
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (state.status === 'idle' && state.duration === 0) {
      // Logic for clear storage on full reset or fresh idle
      // We check state rather than action type here
      if (state.startTime === null) {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state])

  useEffect(() => {
    const isWorkoutOver = state.status === 'idle' && startCalories > 0
    if (isWorkoutOver) return
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, state.status, startCalories])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (state.status === 'running') {
      interval = setInterval(() => {
        if (state.startTime) {
          const now = Date.now()
          const duration = Math.floor(
            (now - state.startTime - state.totalPaused) / 1000
          )
          dispatch({ type: 'TICK', payload: { duration } })
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status, state.startTime, state.totalPaused])

  const resetWorkout = useCallback(() => {
    setStartCalories(0)
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    const now = Date.now()
    setStartCalories(totalCalories)
    if (state.status === 'paused') {
      dispatch({ type: 'RESUME_WORKOUT', payload: { resumeTime: now } })
    } else {
      dispatch({ type: 'START_WORKOUT', payload: { startTime: now } })
    }
  }, [totalCalories, state.status])

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE_WORKOUT', payload: { pauseTime: Date.now() } })
  }, [])

  const endWorkout = useCallback(() => dispatch({ type: 'END_WORKOUT' }), [])

  const caloriesBurned = useMemo(() => {
    if (startCalories === 0) return 0
    const burned = Math.round(state.calories - startCalories)
    return burned > 0 ? burned : 0
  }, [state.calories, startCalories])

  return {
    workoutDuration: state.duration,
    caloriesBurned,
    startTime: state.startTime,
    resetWorkout,
    startWorkout,
    pauseWorkout,
    endWorkout,
    workoutStatus: state.status,
    hasStarted: state.startTime !== null,
  }
}
