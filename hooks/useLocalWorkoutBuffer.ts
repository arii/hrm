// hooks/useLocalWorkoutBuffer.ts

import { useReducer, useCallback } from 'react'
import {
  HeartRateZone,
  HR_ZONE_ORDER,
  calculateZoneFromMaxHr,
  toHeartRateZone,
} from '../lib/shared/hr-zones'
import { HrDataPoint } from '../lib/workout-session-storage'

// --- State, Actions, and Reducer ---

interface WorkoutBufferState {
  hrHistory: HrDataPoint[]
  timeInZones: Record<HeartRateZone, number>
  lastDataPointTime: number | null
}

type WorkoutBufferAction =
  | {
      type: 'ADD_HR_DATA'
      payload: { hr: number; time: number; maxHr: number }
    }
  | { type: 'RESET' }

const initialState: WorkoutBufferState = {
  hrHistory: [],
  timeInZones: Object.fromEntries(
    HR_ZONE_ORDER.map((zone) => [zone, 0])
  ) as Record<HeartRateZone, number>,
  lastDataPointTime: null,
}

function workoutBufferReducer(
  state: WorkoutBufferState,
  action: WorkoutBufferAction
): WorkoutBufferState {
  switch (action.type) {
    case 'ADD_HR_DATA': {
      const { hr, time, maxHr } = action.payload

      // If this is the first data point, just add it to history and set the time.
      if (!state.lastDataPointTime) {
        return {
          ...state,
          hrHistory: [{ time, hr }],
          lastDataPointTime: time,
        }
      }

      const timeDeltaSeconds = (time - state.lastDataPointTime) / 1000
      const newHrHistory = [...state.hrHistory, { time, hr }]

      // Ignore invalid deltas for zone calculation, but still record the HR data point.
      if (timeDeltaSeconds <= 0 || timeDeltaSeconds > 10) {
        return {
          ...state,
          hrHistory: newHrHistory,
          lastDataPointTime: time, // Update time to prevent huge gaps in next calculation
        }
      }

      const previousHrDataPoint = state.hrHistory[state.hrHistory.length - 1]
      // This should not happen if lastDataPointTime is set, but as a safeguard:
      if (!previousHrDataPoint) return state

      const { zone } = calculateZoneFromMaxHr(previousHrDataPoint.hr, maxHr)
      const zoneName = toHeartRateZone(zone)

      const newTimeInZones = {
        ...state.timeInZones,
        [zoneName]: (state.timeInZones[zoneName] || 0) + timeDeltaSeconds,
      }

      return {
        ...state,
        hrHistory: newHrHistory,
        timeInZones: newTimeInZones,
        lastDataPointTime: time,
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// --- The Hook ---

export const useLocalWorkoutBuffer = () => {
  const [state, dispatch] = useReducer(workoutBufferReducer, initialState)

  const addHrData = useCallback((hr: number, maxHr: number) => {
    dispatch({ type: 'ADD_HR_DATA', payload: { hr, time: Date.now(), maxHr } })
  }, [])

  const resetBuffer = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    ...state,
    addHrData,
    resetBuffer,
  }
}
