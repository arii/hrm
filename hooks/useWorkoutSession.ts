import {
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react'

// --- State, Actions, and Reducer for managing session state ---

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
}

type SessionAction =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }
  | { type: 'END_WORKOUT' }
  | { type: 'UPDATE_CALORIES'; payload: number }

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
    case 'CONNECT':
    case 'START_WORKOUT':
      if (state.status === 'paused') {
        // This is a resume. Don't reset duration.
        return { ...state, status: 'running' }
      }
      if (state.status === 'idle') {
        // This is a new workout. Reset duration.
        return { ...state, status: 'running', duration: 0 }
      }
      return state
    case 'DISCONNECT':
      if (state.status === 'running') {
        return { ...state, status: 'paused' }
      }
      return state
    case 'END_WORKOUT':
      // Go idle, reset duration, but preserve calories for the final summary calculation.
      return { ...state, status: 'idle', duration: 0 }
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
  const [startCalories, setStartCalories] = useState(0)

  const sessionDataRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

  useEffect(() => {
    // A workout is considered "over" if the status is idle but we have a startCalories value.
    const isWorkoutOver = state.status === 'idle' && startCalories > 0
    if (isWorkoutOver) {
      return // Don't update calories anymore
    }
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, state.status, startCalories])

  const prevIsConnected = useRef(isConnected)
  useEffect(() => {
    if (prevIsConnected.current !== isConnected) {
      if (isConnected) {
        dispatch({ type: 'CONNECT' })
      } else {
        dispatch({ type: 'DISCONNECT' })
      }
      prevIsConnected.current = isConnected
    }
  }, [isConnected])

  useEffect(() => {
    const session = sessionDataRef.current

    if (state.status === 'running' && session.startTime === null) {
      // A new session is starting.
      session.startTime = Date.now()
      session.pauseTime = null
      session.totalPaused = 0
    } else if (state.status === 'running' && session.pauseTime !== null) {
      // A paused session is resuming.
      session.totalPaused += Date.now() - session.pauseTime
      session.pauseTime = null
    } else if (state.status === 'paused' && session.pauseTime === null) {
      // A running session is being paused.
      session.pauseTime = Date.now()
    }
  }, [state.status])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const session = sessionDataRef.current

    if (state.status === 'running') {
      interval = setInterval(() => {
        if (session.startTime) {
          const duration = Math.floor(
            (Date.now() - session.startTime - session.totalPaused) / 1000
          )
          dispatch({
            type: 'TICK',
            payload: {
              duration,
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
    setStartCalories(0)
    prevIsConnected.current = false
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    // This function can be called to start a new workout or resume a paused one.
    // We only want to capture the starting calorie count when a brand new
    // workout begins, which is when the status is 'idle'.
    // If the workout is paused, this function will resume it without resetting the calorie count.
    if (state.status === 'idle') {
      setStartCalories(totalCalories)
    }
    dispatch({ type: 'START_WORKOUT' })
  }, [totalCalories, state.status])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END_WORKOUT' })
  }, [])

  // Calculate the calories burned *during this session*.
  const caloriesBurned = useMemo(() => {
    if (startCalories === 0) {
      return 0
    }
    const burned = Math.round(state.calories - startCalories)
    return burned > 0 ? burned : 0
  }, [state.calories, startCalories])

  return {
    workoutDuration: state.duration,
    caloriesBurned,
    resetWorkout,
    startWorkout,
    endWorkout,
    workoutStatus: state.status,
    hasStarted: state.status !== 'idle',
  }
}
