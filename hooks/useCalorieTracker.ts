// hooks/useCalorieTracker.ts

import { useCallback, useRef, useEffect, useReducer } from 'react'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import { CalorieDataPoint } from '../lib/workout-session-storage'
import { Gender } from '@/types/core'
import {
  MAX_CALORIES_PER_WORKOUT,
  MIN_HR_FOR_CALORIE_CALCULATION,
  TIME_GAP_THRESHOLD_SECONDS,
} from '@/constants/calorie-thresholds'

interface CalorieTrackerProps {
  age: number
  weightKg: number
  gender?: Gender
  smoothingWindow?: number
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

function calorieReducer(
  state: CalorieState,
  action: CalorieAction
): CalorieState {
  switch (action.type) {
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
 * A hook for tracking calories burned during a workout session.
 * It features a Simple Moving Average (SMA) for smoothing HR input and
 * uses a delta-time approach for accurate calorie accumulation.
 * It also maintains a history of calorie data points.
 */
export const useCalorieTracker = ({
  age,
  weightKg,
  gender = 'FEMALE',
  smoothingWindow = 5,
}: CalorieTrackerProps) => {
  const [state, dispatch] = useReducer(calorieReducer, initialState)
  const lastTimestampRef = useRef<number | null>(null)
  const hrHistoryRef = useRef<number[]>([])

  const ageRef = useRef(age)
  const weightKgRef = useRef(weightKg)
  const genderRef = useRef(gender)

  useEffect(() => {
    ageRef.current = age
    weightKgRef.current = weightKg
    genderRef.current = gender
  }, [age, weightKg, gender])

  const processHeartRate = useCallback(
    (hr: number) => {
      const now = Date.now()

      // 1. Simple Moving Average (SMA) for smoothing
      hrHistoryRef.current.push(hr)
      if (hrHistoryRef.current.length > smoothingWindow) {
        hrHistoryRef.current.shift()
      }
      const sum = hrHistoryRef.current.reduce((a, b) => a + b, 0)
      const smoothedHr = sum / hrHistoryRef.current.length

      // On the first call, lastTimestampRef.current is null.
      // Record a data point with zero calories to avoid gaps at the start.
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

      /**
       * Time gap validation and HR thresholding:
       * - Only process heart rate data if the gap is within TIME_GAP_THRESHOLD_SECONDS.
       * - Only process if smoothed HR is above MIN_HR_FOR_CALORIE_CALCULATION.
       */
      if (
        dtSeconds > 0 &&
        dtSeconds < TIME_GAP_THRESHOLD_SECONDS &&
        smoothedHr > MIN_HR_FOR_CALORIE_CALCULATION
      ) {
        const dtMinutes = dtSeconds / 60
        const caloriesPerSecond =
          estimateCaloriesBurned({
            heartRate: smoothedHr,
            age: ageRef.current,
            weightKg: weightKgRef.current,
            gender: genderRef.current,
            durationMinutes: dtMinutes,
          }) / dtSeconds

        const caloriesBurnedThisInterval = caloriesPerSecond * dtSeconds

        dispatch({
          type: 'PROCESS_HR',
          payload: {
            hr: smoothedHr,
            caloriesBurnedThisInterval,
            now,
            caloriesPerSecond,
          },
        })
      }
      lastTimestampRef.current = now
    },
    [smoothingWindow]
  )

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    lastTimestampRef.current = null
    hrHistoryRef.current = []
  }, [])

  return {
    totalCaloriesBurned: state.totalCaloriesBurned,
    calorieHistory: state.calorieHistory,
    processHeartRate,
    reset,
  }
}
