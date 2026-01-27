import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
  useReducer,
} from 'react'
import { SessionStatus } from './useWorkoutState'

// --- State, Actions, and Reducer for managing session data ---

interface SessionDataState {
  duration: number
  calories: number
}

type SessionDataAction =
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'UPDATE_CALORIES'; payload: number }
  | { type: 'RESET' }

const initialState: SessionDataState = {
  duration: 0,
  calories: 0,
}

function sessionDataReducer(
  state: SessionDataState,
  action: SessionDataAction
): SessionDataState {
  switch (action.type) {
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

// --- The Hook Implementation ---

/**
 * Handles the calculation and management of workout-specific data such as duration and calories burned.
 * It relies on an external workoutStatus to drive its internal timing logic.
 */
interface WorkoutDataOptions {
  workoutStatus: SessionStatus
  totalCalories?: number
}

export const useWorkoutData = ({
  workoutStatus,
  totalCalories,
}: WorkoutDataOptions) => {
  const [state, dispatch] = useReducer(sessionDataReducer, initialState)
  const [startCalories, setStartCalories] = useState(0)

  const sessionDataRef = useRef({
    startTime: null as number | null,
    pauseTime: null as number | null,
    totalPaused: 0,
  })

  useEffect(() => {
    const isWorkoutOver = workoutStatus === 'idle' && startCalories > 0
    if (isWorkoutOver) {
      return
    }
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, workoutStatus, startCalories])

  useEffect(() => {
    const session = sessionDataRef.current

    if (workoutStatus === 'running' && session.startTime === null) {
      session.startTime = Date.now()
      session.pauseTime = null
      session.totalPaused = 0
    } else if (workoutStatus === 'running' && session.pauseTime !== null) {
      session.totalPaused += Date.now() - session.pauseTime
      session.pauseTime = null
    } else if (workoutStatus === 'paused' && session.pauseTime === null) {
      session.pauseTime = Date.now()
    }
  }, [workoutStatus])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const session = sessionDataRef.current

    if (workoutStatus === 'running') {
      interval = setInterval(() => {
        if (session.startTime) {
          const duration = Math.floor(
            (Date.now() - session.startTime - session.totalPaused) / 1000
          )
          dispatch({ type: 'TICK', payload: { duration } })
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [workoutStatus])

  const resetWorkoutData = useCallback(() => {
    const session = sessionDataRef.current
    session.startTime = null
    session.pauseTime = null
    session.totalPaused = 0
    setStartCalories(0)
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkoutData = useCallback(() => {
    setStartCalories(totalCalories)
  }, [totalCalories])

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
    resetWorkoutData,
    startWorkoutData,
  }
}
