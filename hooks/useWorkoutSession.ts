import { useEffect, useReducer, useRef, useCallback } from 'react'

// --- State, Actions, and Reducer for managing session state ---

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  hasBeenStarted: boolean // New state to track if a workout has ever started
}

type SessionAction =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }
  | { type: 'END_WORKOUT' }

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  hasBeenStarted: false,
}

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case 'CONNECT':
    case 'START_WORKOUT':
      if (state.status === 'paused') {
        return { ...state, status: 'running' }
      }
      if (state.status === 'idle') {
        return {
          ...state,
          status: 'running',
          duration: 0,
          hasBeenStarted: true, // Mark as started
        }
      }
      return state
    case 'DISCONNECT':
      if (state.status === 'running') {
        return { ...state, status: 'paused' }
      }
      return state
    case 'END_WORKOUT':
      // Go idle, reset duration, but keep hasBeenStarted true
      return { ...state, status: 'idle', duration: 0 }
    case 'TICK':
      return {
        ...state,
        duration: action.payload.duration,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// --- The Hook Implementation ---

/**
 * Manages the state of a client-side workout session, tracking duration and status.
 */
interface WorkoutSessionOptions {
  isConnected: boolean
}

export const useWorkoutSession = ({ isConnected }: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  const sessionDataRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

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
    prevIsConnected.current = false
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    dispatch({ type: 'START_WORKOUT' })
  }, [])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END_WORKOUT' })
  }, [])

  return {
    workoutDuration: state.duration,
    resetWorkout,
    startWorkout,
    endWorkout,
    workoutStatus: state.status,
    hasStarted: state.hasBeenStarted, // Use the new state property
  }
}
