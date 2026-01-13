// app/client/experimental/useLocalWorkoutBuffer.ts
import { useEffect, useCallback, useRef } from 'react'
import { HrZoneName } from '@/utils/hr-zones'
import { getUserHrZones } from '@/utils/hr-zones'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useUserSettings } from '@/context/UserSettingsContext'

// Define the structure of a single heart rate data point
export interface HrDataPoint {
  time: number
  hr: number
  zone: HrZoneName
}

export type WorkoutStatus = 'idle' | 'running' | 'paused' | 'finished'
export type ActiveWorkoutInputStatus = 'idle' | 'running' | 'paused'

// Define the structure for the entire workout session
export interface WorkoutSessionData {
  startTime: number | null
  endTime: number | null
  status: WorkoutStatus
  hrHistory: HrDataPoint[]
  timeInZones: Record<HrZoneName, number>
}

const initialWorkoutData: WorkoutSessionData = {
  startTime: null,
  endTime: null,
  status: 'idle',
  hrHistory: [],
  timeInZones: {
    [HrZoneName.WarmUp]: 0,
    [HrZoneName.FatBurn]: 0,
    [HrZoneName.Cardio]: 0,
    [HrZoneName.Peak]: 0,
    [HrZoneName.Max]: 0,
    [HrZoneName.NoData]: 0,
    [HrZoneName.Unknown]: 0,
  },
}

/**
 * A hook to capture, manage, and persist workout data on the client-side,
 * synchronized with an external workout status.
 *
 * @param currentHr The current heart rate value from the WebSocket connection.
 * @param workoutStatus The current status of the workout from the main timer.
 */
export const useLocalWorkoutBuffer = (
  currentHr: number,
  workoutStatus: ActiveWorkoutInputStatus
) => {
  const [workoutData, setWorkoutData] = useLocalStorage<WorkoutSessionData>(
    'experimentalWorkoutSession',
    initialWorkoutData
  )
  const [userSettings] = useUserSettings()
  const prevWorkoutStatusRef = useRef(workoutStatus)

  const currentHrRef = useRef(currentHr)
  useEffect(() => {
    currentHrRef.current = currentHr
  }, [currentHr])

  const getZoneForHr = useCallback(
    (hr: number): HrZoneName => {
      if (hr <= 0) return HrZoneName.NoData // Handle no or invalid HR data
      const age = userSettings.userAge || 30
      const zones = getUserHrZones(age)
      if (hr >= zones.max.min) return HrZoneName.Max
      if (hr >= zones.peak.min) return HrZoneName.Peak
      if (hr >= zones.cardio.min) return HrZoneName.Cardio
      if (hr >= zones.fatBurn.min) return HrZoneName.FatBurn
      return HrZoneName.WarmUp
    },
    [userSettings.userAge]
  )

  const recordHrData = useCallback(() => {
    setWorkoutData((prevData) => {
      if (prevData.status !== 'running') return prevData

      const now = Date.now()
      const latestHr = currentHrRef.current
      const currentZone = getZoneForHr(latestHr)

      const newHistory: HrDataPoint = {
        time: now,
        hr: latestHr,
        zone: currentZone,
      }
      const updatedHistory = [...prevData.hrHistory, newHistory]

      const updatedTimeInZones = { ...prevData.timeInZones }
      updatedTimeInZones[currentZone] =
        (updatedTimeInZones[currentZone] || 0) + 1

      return {
        ...prevData,
        hrHistory: updatedHistory,
        timeInZones: updatedTimeInZones,
      }
    })
  }, [getZoneForHr, setWorkoutData])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    // CHANGED: The interval now starts as soon as the workout is running,
    // regardless of whether there's an active HR signal.
    // This allows data collection to begin immediately and catch the HR
    // signal as soon as it's available.
    if (workoutData.status === 'running') {
      intervalId = setInterval(recordHrData, 1000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [workoutData.status, recordHrData])

  useEffect(() => {
    const prevStatus = prevWorkoutStatusRef.current
    if (prevStatus !== workoutStatus) {
      if (workoutStatus === 'running') {
        setWorkoutData((prev) => {
          if (prev.status === 'idle' || prev.status === 'finished') {
            return {
              ...initialWorkoutData,
              status: 'running',
              startTime: Date.now(),
            }
          }
          if (prev.status === 'paused') {
            return { ...prev, status: 'running' }
          }
          return prev
        })
      } else if (workoutStatus === 'paused') {
        setWorkoutData((prev) =>
          prev.status === 'running' ? { ...prev, status: 'paused' } : prev
        )
      } else if (workoutStatus === 'idle') {
        // CHANGED: When the external timer goes idle (e.g., Tabata cycle ends),
        // we now pause the local workout instead of finishing it.
        // This preserves the session, allowing for continuous workouts that
        // span multiple timer cycles.
        setWorkoutData((prev) =>
          prev.status === 'running' ? { ...prev, status: 'paused' } : prev
        )
      }
    }
    prevWorkoutStatusRef.current = workoutStatus
  }, [workoutStatus, setWorkoutData])

  const endWorkout = useCallback(() => {
    setWorkoutData((prev) => ({
      ...prev,
      status: 'finished',
      endTime: Date.now(),
    }))
  }, [setWorkoutData])

  const resetWorkout = useCallback(() => {
    setWorkoutData(initialWorkoutData)
  }, [setWorkoutData])

  return {
    workoutData,
    endWorkout,
    resetWorkout,
  }
}
