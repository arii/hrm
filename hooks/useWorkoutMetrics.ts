// hooks/useWorkoutMetrics.ts
import { useEffect, useMemo, useReducer } from 'react'
import { calculateCaloriesBurned } from '@/utils/health'
import { formatDuration } from '@/utils/time'

interface UseWorkoutMetricsProps {
  currentHR: number
  userAge: number
  timeElapsed: number
}

interface HrState {
  hrSum: number
  hrCount: number
}

type HrAction =
  | { type: 'ADD_HR'; payload: number }
  | { type: 'RESET' }

const initialState: HrState = {
  hrSum: 0,
  hrCount: 0,
}

function hrReducer(state: HrState, action: HrAction): HrState {
  switch (action.type) {
    case 'ADD_HR':
      return {
        hrSum: state.hrSum + action.payload,
        hrCount: state.hrCount + 1,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function useWorkoutMetrics({
  currentHR,
  userAge,
  timeElapsed,
}: UseWorkoutMetricsProps) {
  const [state, dispatch] = useReducer(hrReducer, initialState)

  useEffect(() => {
    if (timeElapsed === 0) {
      dispatch({ type: 'RESET' })
    } else if (currentHR > 0) {
      dispatch({ type: 'ADD_HR', payload: currentHR })
    }
  }, [currentHR, timeElapsed])

  const averageHr = state.hrCount > 0 ? state.hrSum / state.hrCount : 0
  const isWorkoutActive = timeElapsed > 0

  const caloriesBurned = userAge
    ? calculateCaloriesBurned(averageHr, userAge, timeElapsed)
    : 0

  return useMemo(
    () => ({
      workoutDuration: formatDuration(timeElapsed),
      caloriesBurned: caloriesBurned.toFixed(0),
      isWorkoutActive,
    }),
    [timeElapsed, caloriesBurned, isWorkoutActive]
  )
}
