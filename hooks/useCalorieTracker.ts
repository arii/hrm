// hooks/useCalorieTracker.ts

import { useCallback, useRef, useEffect, useReducer } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { CalorieDataPoint } from '../lib/workout-session-storage'
import { Gender } from '@/types/core'
import {
  MAX_CALORIES_PER_WORKOUT,
  TIME_GAP_THRESHOLD_SECONDS,
  MIN_HR_FOR_CALORIE_CALCULATION,
} from '@/constants/calorie-thresholds'

interface CalorieTrackerProps {
  age: number
  weightKg: number
  gender?: Gender
  smoothingWindow?: number
  initialCalories?: number
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
  | { type: 'SET_CALORIES'; payload: number }

const initialState: CalorieState = {
  totalCaloriesBurned: 0,
  calorieHistory: [],
}

function calorieReducer(
  state: CalorieState,
  action: CalorieAction
): CalorieState {
  switch (action.type) {
    case 'SET_CALORIES':
      return {
        ...state,
        totalCaloriesBurned: action.payload,
      }
    case 'PROCESS_HR': {
      const { hr, caloriesBurnedThisInterval, now, caloriesPerSecond } =
        action.payload
      const newTotal = Math.min(
        state.totalCaloriesBurned + caloriesBurnedThisInterval,
        MAX_CALORIES_PER_WORKOUT
      )
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

/**
 * A hook for tracking and calculating calories burned during a workout.
 * Features SMA smoothing, history tracking, and safety thresholds.
 */
export const useCalorieTracker = ({
  age,
  weightKg,
  gender = 'NEUTRAL',
  smoothingWindow = 5,
  initialCalories = 0,
}: CalorieTrackerProps) => {
  const [state, dispatch] = useReducer(calorieReducer, {
    ...initialState,
    totalCaloriesBurned: initialCalories,
  })
  const lastTimestampRef = useRef<number | null>(null)
  const hrHistoryRef = useRef<number[]>([])

  const ageRef = useRef(age)
  const weightKgRef = useRef(weightKg)
  const genderRef = useRef(gender)

  // Keep refs updated to avoid stale closures in callbacks
  useEffect(() => {
    ageRef.current = age
    weightKgRef.current = weightKg
    genderRef.current = gender
  }, [age, weightKg, gender])

  /**
   * Processes a new heart rate measurement.
   * - Smooths the HR value using a Simple Moving Average.
   * - Calculates the time delta since the last measurement.
   * - Estimates calories burned for the delta time and accumulates it.
   */
  const processHeartRate = useCallback(
    (heartRate: number) => {
      const now = Date.now()

      // 1. Simple Moving Average (SMA) for smoothing
      hrHistoryRef.current.push(heartRate)
      if (hrHistoryRef.current.length > smoothingWindow) {
        hrHistoryRef.current.shift()
      }
      const sum = hrHistoryRef.current.reduce((a, b) => a + b, 0)
      const smoothedHr = sum / hrHistoryRef.current.length

      // On the first call, lastTimestampRef.current is null.
      if (!lastTimestampRef.current) {
        dispatch({
          type: 'PROCESS_HR',
          payload: {
            hr: smoothedHr,
            caloriesBurnedThisInterval: 0,
            now,
            caloriesPerSecond: 0,
          },
        })
        lastTimestampRef.current = now
        return
      }

      const dtSeconds = (now - lastTimestampRef.current) / 1000

      // Validate time gap and minimum heart rate
      if (
        dtSeconds > 0 &&
        dtSeconds < TIME_GAP_THRESHOLD_SECONDS &&
        smoothedHr > MIN_HR_FOR_CALORIE_CALCULATION
      ) {
        const dtMinutes = dtSeconds / 60
        const totalCaloriesForInterval = estimateCaloriesBurned({
          heartRate: smoothedHr,
          age: ageRef.current,
          weightKg: weightKgRef.current,
          gender: genderRef.current,
          durationMinutes: dtMinutes,
        })

        const caloriesPerSecond = totalCaloriesForInterval / dtSeconds

        dispatch({
          type: 'PROCESS_HR',
          payload: {
            hr: smoothedHr,
            caloriesBurnedThisInterval: totalCaloriesForInterval,
            now,
            caloriesPerSecond,
          },
        })
      }
      lastTimestampRef.current = now
    },
    [smoothingWindow]
  )

  /**
   * Resets the tracker to initial state.
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    lastTimestampRef.current = null
    hrHistoryRef.current = []
  }, [])

  const setCalories = useCallback((calories: number) => {
    dispatch({ type: 'SET_CALORIES', payload: calories })
  }, [])

  return {
    totalCaloriesBurned: state.totalCaloriesBurned,
    calorieHistory: state.calorieHistory,
    processHeartRate,
    reset,
    setCalories,
  }
}
