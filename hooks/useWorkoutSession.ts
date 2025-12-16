import { useEffect, useReducer, useRef, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
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
  | { type: 'TICK'; payload: { duration: number; calories: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }
  | { type: 'END_WORKOUT' }

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
      if (state.status === 'idle' || state.status === 'paused') {
        return { ...state, status: 'running' }
      }
      return state
    case 'DISCONNECT':
      if (state.status === 'running') {
        return { ...state, status: 'paused' }
      }
      return state
    case 'END_WORKOUT':
      return initialState
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
  userName: string
}

export const useWorkoutSession = ({
  isConnected,
  userName,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const { hrmData } = useWebSocket()

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
        const userData = hrmData.find((d) => d.name === userName)
        const calories = userData?.calories ?? 0

        if (session.startTime) {
          const duration = Math.floor(
            (Date.now() - session.startTime - session.totalPaused) / 1000
          )
          dispatch({
            type: 'TICK',
            payload: {
              duration,
              calories: calories,
            },
          })
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status, hrmData, userName])

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
    caloriesBurned: Math.round(state.calories),
    resetWorkout,
    startWorkout,
    endWorkout,
    workoutStatus: state.status,
    hasStarted: state.status !== 'idle',
  }
}
