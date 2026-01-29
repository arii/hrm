// hooks/useCalorieTracker.ts

import { useCallback, useRef, useEffect, useReducer } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { CalorieDataPoint } from '../lib/workout-session-storage'

interface CalorieTrackerProps {
  age: number
  weightKg: number
}

interface CalorieState {
  totalCaloriesBurned: number
  calorieHistory: CalorieDataPoint[]
}

type CalorieAction =
  | {
      type: 'PROCESS_HR'
      payload: {
        hr: number
        caloriesBurnedThisInterval: number
        now: number
        caloriesPerSecond: number
      }
    }
  | { type: 'RESET' }

const initialState: CalorieState = {
  totalCaloriesBurned: 0,
  calorieHistory: [],
}

function calorieReducer(state: CalorieState, action: CalorieAction): CalorieState {
  switch (action.type) {
    case 'PROCESS_HR': {
      const { hr, caloriesBurnedThisInterval, now, caloriesPerSecond } =
        action.payload
      const newTotal = state.totalCaloriesBurned + caloriesBurnedThisInterval
      const newDataPoint: CalorieDataPoint = {
        time: now,
        hr,
        caloriesPerSecond,
        totalToThisPoint: newTotal,
      }
      return {
        totalCaloriesBurned: newTotal,
        calorieHistory: [...state.calorieHistory, newDataPoint],
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export const useCalorieTracker = ({ age, weightKg }: CalorieTrackerProps) => {
  const [state, dispatch] = useReducer(calorieReducer, initialState)
  const lastTimestampRef = useRef<number | null>(null)

  const ageRef = useRef(age)
  const weightKgRef = useRef(weightKg)

  useEffect(() => {
    ageRef.current = age
    weightKgRef.current = weightKg
  }, [age, weightKg])

  const processHeartRate = useCallback((hr: number) => {
    const now = Date.now()
    if (lastTimestampRef.current) {
      const dtSeconds = (now - lastTimestampRef.current) / 1000
      if (dtSeconds > 0 && dtSeconds < 10) {
        // Prevent large gaps
        const dtMinutes = dtSeconds / 60
        const caloriesPerSecond =
          estimateCaloriesBurned({
            heartRate: hr,
            age: ageRef.current,
            weightKg: weightKgRef.current,
            durationMinutes: dtMinutes,
          }) / dtSeconds

        const caloriesBurnedThisInterval = caloriesPerSecond * dtSeconds

        dispatch({
          type: 'PROCESS_HR',
          payload: {
            hr,
            caloriesBurnedThisInterval,
            now,
            caloriesPerSecond,
          },
        })
      }
    }
    lastTimestampRef.current = now
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    lastTimestampRef.current = null
  }, [])

  return {
    totalCaloriesBurned: state.totalCaloriesBurned,
    calorieHistory: state.calorieHistory,
    processHeartRate,
    reset,
  }
}
