'use client'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import { useWebSocket } from './WebSocketContext'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { useUserSettings } from './UserSettingsContext'

// Define the shape of a single record in the workout buffer
interface WorkoutRecord {
  time: number // ms timestamp
  hr: number
}

// Define the shape of the workout state
interface WorkoutState {
  sessionStartTime: number | null
  workoutDuration: number // in seconds
  caloriesBurned: number
  buffer: WorkoutRecord[]
  isWorkoutRunning: boolean
}

// Create the context
export const WorkoutContext = createContext<WorkoutState | null>(null)

// Initial state for the workout
const INITIAL_WORKOUT_STATE: WorkoutState = {
  sessionStartTime: null,
  workoutDuration: 0,
  caloriesBurned: 0,
  buffer: [],
  isWorkoutRunning: false,
}

type Action =
  | { type: 'START_WORKOUT'; payload: { time: number } }
  | { type: 'STOP_WORKOUT' }
  | {
      type: 'ADD_WORKOUT_DATA'
      payload: {
        record: WorkoutRecord
        duration: number
        calories: number
      }
    }

const workoutReducer = (state: WorkoutState, action: Action): WorkoutState => {
  switch (action.type) {
    case 'START_WORKOUT':
      return {
        ...state,
        sessionStartTime: action.payload.time,
        isWorkoutRunning: true,
      }
    case 'STOP_WORKOUT':
      return {
        ...state,
        isWorkoutRunning: false,
      }
    case 'ADD_WORKOUT_DATA':
      return {
        ...state,
        buffer: [...state.buffer, action.payload.record],
        workoutDuration: action.payload.duration,
        caloriesBurned: action.payload.calories,
      }
    default:
      return state
  }
}

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const { hrmData } = useWebSocket()
  const { userAge, userWeight } = useUserSettings()
  const [state, dispatch] = useReducer(workoutReducer, INITIAL_WORKOUT_STATE)

  useEffect(() => {
    const primaryUser = hrmData?.find((d) => d.hr > 0)

    if (primaryUser && !state.isWorkoutRunning) {
      dispatch({ type: 'START_WORKOUT', payload: { time: Date.now() } })
    } else if (!primaryUser && state.isWorkoutRunning) {
      dispatch({ type: 'STOP_WORKOUT' })
    }

    if (primaryUser && state.sessionStartTime) {
      const now = Date.now()
      const lastRecordTime =
        state.buffer.length > 0 ? state.buffer[state.buffer.length - 1].time : 0
      if (now - lastRecordTime >= 1000) {
        const durationSeconds = Math.floor(
          (now - state.sessionStartTime) / 1000
        )
        const newRecord = { time: now, hr: primaryUser.hr }
        const newBuffer = [...state.buffer, newRecord]
        const durationMinutes = durationSeconds / 60
        const avgHr =
          newBuffer.reduce((acc, record) => acc + record.hr, 0) /
          newBuffer.length
        const calories =
          durationMinutes > 0
            ? estimateCaloriesBurned({
                age: userAge,
                weight: userWeight,
                durationMinutes,
                avgHr,
              })
            : 0
        dispatch({
          type: 'ADD_WORKOUT_DATA',
          payload: {
            record: newRecord,
            duration: durationSeconds,
            calories,
          },
        })
      }
    }
  }, [hrmData, state, userAge, userWeight])

  return (
    <WorkoutContext.Provider value={state}>{children}</WorkoutContext.Provider>
  )
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}
