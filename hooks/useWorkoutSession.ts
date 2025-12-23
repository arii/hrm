import {
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react'
import type { WorkoutSession } from '@/types/core' // Import the type

// --- State, Actions, and Reducer for managing session state ---

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
  error: string | null // Add error state
}

type SessionAction =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | { type: 'START_WORKOUT' }
  | { type: 'END_WORKOUT' }
  | { type: 'UPDATE_CALORIES'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null } // Add error action

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
  error: null,
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
        return { ...state, status: 'running', error: null }
      }
      if (state.status === 'idle') {
        // This is a new workout. Reset duration.
        return { ...state, status: 'running', duration: 0, error: null }
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
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
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
  totalCalories?: number
  userId: string // Add userId as a required prop
}

export const useWorkoutSession = ({
  isConnected,
  totalCalories = 0,
  userId, // Destructure userId
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [startCalories, setStartCalories] = useState(0)
  // State to hold the current workout session from the database
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    null
  )

  const sessionDataRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

  useEffect(() => {
    const hydrateSession = async () => {
      const sessionId = localStorage.getItem('activeWorkoutSessionId')
      if (sessionId) {
        try {
          const response = await fetch(`/api/workouts/${sessionId}`)
          if (response.ok) {
            const session = await response.json()
            setActiveSession(session)
            dispatch({ type: 'START_WORKOUT' })
          } else {
            localStorage.removeItem('activeWorkoutSessionId')
          }
        } catch (error) {
          console.error('Failed to hydrate workout session:', error)
          localStorage.removeItem('activeWorkoutSessionId')
        }
      }
    }
    hydrateSession()
  }, [])

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
    setActiveSession(null) // Reset active session
    localStorage.removeItem('activeWorkoutSessionId')
    prevIsConnected.current = false
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(async () => {
    // Capture the calorie count at the moment the workout starts.
    setStartCalories(totalCalories)
    dispatch({ type: 'START_WORKOUT' })

    // Create a new workout session in the database
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          startedAt: new Date().toISOString(),
          notes: 'New workout session',
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to create workout session')
      }
      const newSession = await response.json()
      setActiveSession(newSession)
      localStorage.setItem('activeWorkoutSessionId', newSession.id)
    } catch (error) {
      console.error('Error starting workout session:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to start workout session.',
      })
    }
  }, [totalCalories, userId])

  const endWorkout = useCallback(async () => {
    if (!activeSession) return

    dispatch({ type: 'END_WORKOUT' })

    // Update the workout session in the database
    try {
      const response = await fetch(`/api/workouts/${activeSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to end workout session')
      }
      const updatedSession = await response.json()
      setActiveSession(updatedSession)
      localStorage.removeItem('activeWorkoutSessionId')
    } catch (error) {
      console.error('Error ending workout session:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to end workout session.' })
    }
  }, [activeSession])

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
    activeSession, // Expose the active session
    error: state.error, // Expose the error state
  }
}
