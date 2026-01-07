// app/client/experimental/useLocalWorkoutBuffer.ts
import { useEffect, useCallback } from 'react'
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

// Define the structure for the entire workout session
export interface WorkoutSessionData {
  startTime: number | null
  endTime: number | null
  status: 'idle' | 'running' | 'paused' | 'finished'
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
 * A hook to capture, manage, and persist workout data on the client-side.
 *
 * @param currentHr The current heart rate value from the WebSocket connection.
 * @param workoutStatus The current status of the workout ('running', 'paused', etc.).
 */
export const useLocalWorkoutBuffer = (
  currentHr: number,
  workoutStatus: 'idle' | 'running' | 'paused'
) => {
  const [workoutData, setWorkoutData] = useLocalStorage<WorkoutSessionData>(
    'experimentalWorkoutSession',
    initialWorkoutData
  )
  const [userSettings] = useUserSettings()

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
      const currentZone = getZoneForHr(currentHr)

      const newHistory: HrDataPoint = {
        time: now,
        hr: currentHr,
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
  }, [currentHr, getZoneForHr, setWorkoutData])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (workoutStatus === 'running' && currentHr > 0) {
      intervalId = setInterval(recordHrData, 1000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [workoutStatus, currentHr, recordHrData])

  const startWorkout = useCallback(() => {
    setWorkoutData(() => ({
      ...initialWorkoutData,
      status: 'running',
      startTime: Date.now(),
    }))
  }, [setWorkoutData])

  const pauseWorkout = useCallback(() => {
    setWorkoutData((prev) =>
      prev.status === 'running' ? { ...prev, status: 'paused' } : prev
    )
  }, [setWorkoutData])

  const resumeWorkout = useCallback(() => {
    setWorkoutData((prev) =>
      prev.status === 'paused' ? { ...prev, status: 'running' } : prev
    )
  }, [setWorkoutData])

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

  useEffect(() => {
    if (
      workoutData.status === 'finished' ||
      workoutData.status === workoutStatus
    ) {
      return // No change needed or already finished
    }
    switch (workoutStatus) {
      case 'idle':
        if (
          workoutData.status === 'running' ||
          workoutData.status === 'paused'
        ) {
          endWorkout()
        }
        break
      case 'running':
        if (workoutData.status === 'idle') {
          startWorkout()
        } else if (workoutData.status === 'paused') {
          resumeWorkout()
        }
        break
      case 'paused':
        if (workoutData.status === 'running') {
          pauseWorkout()
        }
        break
      default:
        break
    }
  }, [
    workoutStatus,
    workoutData.status,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
  ])

  return {
    workoutData,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
  }
}
