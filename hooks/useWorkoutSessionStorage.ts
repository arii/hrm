// hooks/useWorkoutSessionStorage.ts
import { useState, useEffect, useCallback } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import {
  WorkoutSessionData,
  createNewSession,
  validateAndMigrateSessionData,
  HrDataPoint,
  CalorieDataPoint,
} from '@/lib/sessionDataValidator'
import { getUserHrZones, HrZoneName } from '@/utils/hr-zones'
import { useUserSettings } from '@/context/UserSettingsContext'

const WORKOUT_STORAGE_KEY = 'workoutSessionsHistory'

/**
 * A comprehensive hook for managing workout sessions with persistent storage.
 */
export const useWorkoutSessionStorage = () => {
  const [storedSessions, setStoredSessions] = useLocalStorage<
    WorkoutSessionData[]
  >(WORKOUT_STORAGE_KEY, [])
  const [allSessions, setAllSessions] = useState<WorkoutSessionData[]>(() => {
    const validSessions = storedSessions
      .map(validateAndMigrateSessionData)
      .filter((s): s is WorkoutSessionData => s !== null)
    return validSessions
  })

  const [activeSession, setActiveSession] = useState<WorkoutSessionData | null>(
    () => {
      const unfinishedSession = allSessions.find(
        (s) => s.status === 'running' || s.status === 'paused'
      )
      return unfinishedSession || null
    }
  )
  const [userSettings] = useUserSettings()

  // Persist changes to allSessions back to localStorage
  useEffect(() => {
    setStoredSessions(allSessions)
  }, [allSessions, setStoredSessions])

  const getZoneForHr = useCallback(
    (hr: number): HrZoneName => {
      if (hr <= 0) return HrZoneName.NoData
      const zones = getUserHrZones(userSettings.userAge || 30)
      if (hr >= zones.max.min) return HrZoneName.Max
      if (hr >= zones.peak.min) return HrZoneName.Peak
      if (hr >= zones.cardio.min) return HrZoneName.Cardio
      if (hr >= zones.fatBurn.min) return HrZoneName.FatBurn
      return HrZoneName.WarmUp
    },
    [userSettings.userAge]
  )

  const updateSession = (updatedSession: WorkoutSessionData) => {
    setActiveSession(updatedSession)
    setAllSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    )
  }

  const startNewWorkout = useCallback(() => {
    const newSession = createNewSession()
    setActiveSession(newSession)
    setAllSessions((prev) => [...prev, newSession])
  }, [])

  const endWorkout = useCallback(() => {
    if (!activeSession) return
    const updatedSession = {
      ...activeSession,
      status: 'finished' as const,
      endTime: Date.now(),
    }
    updateSession(updatedSession)
    setActiveSession(null) // No longer active
  }, [activeSession])

  const pauseWorkout = useCallback(() => {
    if (activeSession?.status === 'running') {
      updateSession({ ...activeSession, status: 'paused' })
    }
  }, [activeSession])

  const resumeWorkout = useCallback(() => {
    if (activeSession?.status === 'paused') {
      updateSession({ ...activeSession, status: 'running' })
    }
  }, [activeSession])

  const recordDataPoint = useCallback(
    (hr: number, calories: number) => {
      if (activeSession?.status !== 'running') return

      const now = Date.now()
      const currentZone = getZoneForHr(hr)

      const newHrPoint: HrDataPoint = { time: now, hr, zone: currentZone }
      const newCaloriePoint: CalorieDataPoint = { time: now, calories }

      const updatedTimeInZones = { ...activeSession.timeInZones }
      updatedTimeInZones[currentZone] =
        (updatedTimeInZones[currentZone] || 0) + 1

      updateSession({
        ...activeSession,
        hrHistory: [...activeSession.hrHistory, newHrPoint],
        calorieHistory: [...activeSession.calorieHistory, newCaloriePoint],
        timeInZones: updatedTimeInZones,
      })
    },
    [activeSession, getZoneForHr]
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
      }
    },
    [activeSession]
  )

  return {
    activeSession,
    allSessions,
    startNewWorkout,
    endWorkout,
    pauseWorkout,
    resumeWorkout,
    recordDataPoint,
    deleteSession,
  }
}
