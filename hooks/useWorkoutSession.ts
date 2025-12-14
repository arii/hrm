import { useEffect, useReducer, useRef, useCallback } from 'react'

// --- State, Actions, and Reducer for managing session state ---

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
}

type SessionAction =
  | { type: 'DISCONNECT' }
  | { type: 'TICK'; payload: { duration: number; calories: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
}

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'START_WORKOUT':
      if (state.status === 'idle' || state.status === 'paused') {
        return { ...state, status: 'running' }
      }
      return state
    case 'DISCONNECT':
      if (state.status === 'running') {
        return { ...state, status: 'paused' }
      }
      return state
    case 'TICK':
      return {
        ...state,
        duration: action.payload.duration,
        calories: action.payload.calories,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// --- The Hook Implementation ---

interface WorkoutSessionOptions {
  isConnected: boolean
  currentHR: number
  userAge: number
  userWeight: number
}

export const useWorkoutSession = ({
  isConnected,
  currentHR,
  userAge,
  userWeight,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  const sessionDataRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
    accumulatedCalories: 0,
  })

  const latestMetrics = useRef({ currentHR, userAge, userWeight })
  useEffect(() => {
    latestMetrics.current = { currentHR, userAge, userWeight }
  }, [currentHR, userAge, userWeight])

  const prevIsConnected = useRef(isConnected)
  useEffect(() => {
    if (prevIsConnected.current && !isConnected) {
      dispatch({ type: 'DISCONNECT' })
    }
    prevIsConnected.current = isConnected
  }, [isConnected])

  useEffect(() => {
    const session = sessionDataRef.current
    if (state.status === 'running' && session.startTime === null) {
      session.startTime = Date.now()
      session.pauseTime = null
      session.totalPaused = 0
    } else if (state.status === 'running' && session.pauseTime !== null) {
      session.totalPaused += Date.now() - session.pauseTime
      session.pauseTime = null
    } else if (state.status === 'paused' && session.pauseTime === null) {
      session.pauseTime = Date.now()
    }
  }, [state.status])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const session = sessionDataRef.current

    if (state.status === 'running') {
      interval = setInterval(() => {
        const {
          currentHR: hr,
          userAge: age,
          userWeight: weightKg,
        } = latestMetrics.current
        if (session.startTime) {
          const duration = Math.floor(
            (Date.now() - session.startTime - session.totalPaused) / 1000
          )
          if (age > 0 && hr > 0 && weightKg > 0) {
            const caloriesPerMinute =
              (age * 0.2017 - weightKg * 0.09036 + hr * 0.6309 - 55.0969) /
              4.184
            const caloriesPerSecond = Math.max(0, caloriesPerMinute / 60)
            session.accumulatedCalories += caloriesPerSecond
          }
          dispatch({
            type: 'TICK',
            payload: {
              duration,
              calories: session.accumulatedCalories,
            },
          })
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status])

  const resetWorkout = useCallback(() => {
    const session = sessionDataRef.current
    session.startTime = null
    session.pauseTime = null
    session.totalPaused = 0
    session.accumulatedCalories = 0
    prevIsConnected.current = false
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    dispatch({ type: 'START_WORKOUT' })
  }, [])

  const endWorkout = useCallback(() => {
    resetWorkout()
  }, [resetWorkout])

  return {
    workoutDuration: state.duration,
    caloriesBurned: Math.round(state.calories),
    resetWorkout,
    startWorkout,
    endWorkout,
    workoutStatus: state.status,
    hasStarted: state.status !== 'idle',
  }
}
