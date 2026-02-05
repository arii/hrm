import { useEffect, useReducer, useRef, useCallback, useMemo } from 'react'

// --- State, Actions, and Reducer for managing session state ---

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
  startTime: number | null
  startCalories: number
  totalPaused: number
  pauseTime: number | null
}

type SessionAction =
  | { type: 'CONNECT'; payload: { now: number } }
  | { type: 'DISCONNECT'; payload: { now: number } }
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | {
      type: 'START_WORKOUT'
      payload: { startTime: number; startCalories: number; now: number }
    }
  | { type: 'PAUSE_WORKOUT'; payload: { now: number } }
  | { type: 'END_WORKOUT' }
  | { type: 'UPDATE_CALORIES'; payload: number }

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
  startTime: null,
  startCalories: 0,
  totalPaused: 0,
  pauseTime: null,
}

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'CONNECT':
      if (state.status === 'paused') {
        const addedPaused = state.pauseTime
          ? action.payload.now - state.pauseTime
          : 0
        return {
          ...state,
          status: 'running',
          pauseTime: null,
          totalPaused: state.totalPaused + addedPaused,
        }
      }
      return state

    case 'START_WORKOUT':
      if (state.status === 'idle') {
        // Start new workout
        return {
          ...state,
          status: 'running',
          duration: 0,
          startTime: action.payload.startTime,
          startCalories: action.payload.startCalories,
          totalPaused: 0,
          pauseTime: null,
        }
      }
      if (state.status === 'paused') {
        // Resume existing
        const addedPaused = state.pauseTime
          ? action.payload.now - state.pauseTime
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
    case 'DISCONNECT':
      if (state.status === 'running') {
        return {
          ...state,
          status: 'paused',
          pauseTime: action.payload.now,
        }
      }
      return state

    case 'END_WORKOUT':
      // Go idle but KEEP the data (duration/calories/startTime) for the summary view
      return {
        ...state,
        status: 'idle',
        pauseTime: null,
      }

    case 'TICK':
      return {
        ...state,
        duration: action.payload.duration,
      }
    case 'UPDATE_CALORIES':
      return {
        ...state,
        calories: action.payload,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// --- The Hook Implementation ---

/**
 * Manages the state of a client-side workout session, tracking duration.
 *
 * NOTE: Calorie calculation is no longer performed in this hook.
 * It is now handled server-side and streamed via the WebSocket connection.
 * This hook consumes the final `totalCalories` value to ensure data consistency
 * across the application.
 */
interface WorkoutSessionOptions {
  isConnected: boolean
  totalCalories?: number
}

export const useWorkoutSession = ({
  isConnected,
  totalCalories = 0,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  useEffect(() => {
    // A workout is considered "over" if the status is idle but we have a startCalories value.
    const isWorkoutOver = state.status === 'idle' && state.startCalories > 0
    if (isWorkoutOver) {
      return // Don't update calories anymore
    }
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, state.status, state.startCalories])

  const prevIsConnected = useRef(isConnected)
  useEffect(() => {
    if (prevIsConnected.current !== isConnected) {
      const now = Date.now()
      if (isConnected) {
        dispatch({ type: 'CONNECT', payload: { now } })
      } else {
        dispatch({ type: 'DISCONNECT', payload: { now } })
      }
      prevIsConnected.current = isConnected
    }
  }, [isConnected])

  // Interval Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (state.status === 'running' && state.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor(
          (Date.now() - state.startTime! - state.totalPaused) / 1000
        )
        dispatch({
          type: 'TICK',
          payload: {
            duration,
          },
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status, state.startTime, state.totalPaused])

  const resetWorkout = useCallback(() => {
    prevIsConnected.current = false
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    const now = Date.now()
    dispatch({
      type: 'START_WORKOUT',
      payload: {
        startTime: now,
        startCalories: totalCalories,
        now,
      },
    })
  }, [totalCalories])

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE_WORKOUT', payload: { now: Date.now() } })
  }, [])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END_WORKOUT' })
  }, [])

  // Calculate the calories burned *during this session*.
  const caloriesBurned = useMemo(() => {
    if (state.startCalories === 0) {
      return 0
    }
    const burned = Math.round(state.calories - state.startCalories)
    return burned > 0 ? burned : 0
  }, [state.calories, state.startCalories])

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
