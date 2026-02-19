// hooks/useWorkoutSessionManager.ts

import { useReducer, useEffect, useCallback, useState } from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
  HrDataPoint,
  CalorieDataPoint,
} from '../lib/workout-session-storage'
import { WorkoutStatus } from '@/types/workout'
import {
  HeartRateZone,
  HR_ZONE_ORDER,
  calculateZoneFromMaxHr,
  toHeartRateZone,
} from '../lib/shared/hr-zones'
import { v4 as uuidv4 } from 'uuid'
import { calculateMaxHr } from '@/utils/hrCalculations'
import { useAppSnackbar } from './useAppSnackbar'
import { isSessionStale } from '../lib/workout-session'
import { Gender } from '@/types/core'
import { estimateCaloriesBurned } from '../lib/calorie-estimation'

// --- State, Actions, and Reducer ---

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: WorkoutStatus
}

type SessionManagerAction =
  | { type: 'SET_SESSION'; payload: WorkoutSessionData }
  | {
      type: 'START'
      payload: {
        age: number
        weight: number
        gender?: Gender
        maxHr?: number
      }
    }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'END' }
  | { type: 'RESET' }
  | { type: 'ADD_HR_DATA'; payload: HrDataPoint }

const initialState: SessionManagerState = {
  session: null,
  status: 'idle',
}

function sessionManagerReducer(
  state: SessionManagerState,
  action: SessionManagerAction
): SessionManagerState {
  switch (action.type) {
    case 'SET_SESSION': {
      return {
        ...state,
        session: action.payload,
        status: action.payload.status,
      }
    }
    case 'START': {
      const {
        age,
        weight,
        maxHr: providedMaxHr,
        gender = 'NEUTRAL',
      } = action.payload
      const maxHr = providedMaxHr || calculateMaxHr(age)
      const initialTimeInZones = Object.fromEntries(
        HR_ZONE_ORDER.map((zone) => [zone, 0])
      ) as Record<HeartRateZone, number>

      const newSession: WorkoutSessionData = {
        sessionId: uuidv4(),
        startTime: Date.now(),
        endTime: null,
        status: 'running',
        hrHistory: [],
        timeInZones: initialTimeInZones,
        averageHr: 0,
        maxHr: 0,
        calorieHistory: [],
        totalCaloriesBurned: 0,
        userSettings: { age, weight, maxHr, gender },
        lastSyncTime: Date.now(),
        syncStatus: 'pending',
      }
      return {
        ...state,
        session: newSession,
        status: 'running',
      }
    }
    case 'PAUSE': {
      if (!state.session || state.status !== 'running') return state
      return {
        ...state,
        session: { ...state.session, status: 'paused' },
        status: 'paused',
      }
    }
    case 'RESUME': {
      if (!state.session) return state
      return {
        ...state,
        session: { ...state.session, status: 'running' },
        status: 'running',
      }
    }
    case 'END': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
        },
        status: 'finished',
      }
    }
    case 'RESET': {
      return initialState
    }
    case 'ADD_HR_DATA': {
      if (!state.session || state.status !== 'running') return state

      const lastDataPoint =
        state.session.hrHistory[state.session.hrHistory.length - 1]
      const timeDelta = lastDataPoint
        ? (action.payload.time - lastDataPoint.time) / 1000
        : 1

      // Zone calculation
      const { zone } = calculateZoneFromMaxHr(
        action.payload.hr,
        state.session.userSettings.maxHr
      )
      const zoneName = toHeartRateZone(zone)
      const newTimeInZones = {
        ...state.session.timeInZones,
        [zoneName]: (state.session.timeInZones[zoneName] || 0) + timeDelta,
      }

      // HR History & Stats
      const newHrHistory = [...state.session.hrHistory, action.payload]
      const newMaxHr = Math.max(state.session.maxHr, action.payload.hr)
      const oldAverage = state.session.averageHr
      const oldLength = state.session.hrHistory.length
      const newAverageHr =
        (oldAverage * oldLength + action.payload.hr) / (oldLength + 1)

      // Calorie Calculation
      let caloriesBurnedThisInterval = 0
      let caloriesPerSecond = 0

      if (lastDataPoint && timeDelta > 0 && timeDelta < 10) {
        const dtMinutes = timeDelta / 60
        const totalCalories = estimateCaloriesBurned({
          heartRate: action.payload.hr,
          age: state.session.userSettings.age,
          weightKg: state.session.userSettings.weight,
          gender: state.session.userSettings.gender,
          durationMinutes: dtMinutes,
        })
        caloriesBurnedThisInterval = totalCalories
        caloriesPerSecond = totalCalories / timeDelta
      }

      const newTotalCalories =
        state.session.totalCaloriesBurned + caloriesBurnedThisInterval

      const newCaloriePoint: CalorieDataPoint = {
        time: action.payload.time,
        hr: action.payload.hr,
        caloriesPerSecond,
        totalToThisPoint: newTotalCalories,
      }

      return {
        ...state,
        session: {
          ...state.session,
          hrHistory: newHrHistory,
          maxHr: newMaxHr,
          averageHr: newAverageHr,
          timeInZones: newTimeInZones,
          calorieHistory: [...state.session.calorieHistory, newCaloriePoint],
          totalCaloriesBurned: newTotalCalories,
        },
      }
    }
    default:
      return state
  }
}

// --- The Hook ---

export const useWorkoutSessionManager = () => {
  const [state, dispatch] = useReducer(sessionManagerReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)
  const { showInfo, showSuccess, showError } = useAppSnackbar()

  const clearStaleSession = useCallback(
    async (
      session: WorkoutSessionData,
      message: string,
      onStale: (message: string) => void
    ) => {
      if (isSessionStale(session)) {
        const sessionDate = new Date(session.startTime)
        console.info(
          `[SessionManager] Stale session from ${sessionDate.toDateString()} detected. Clearing for new day ${new Date().toDateString()}.`
        )
        await workoutSessionStorage.deleteSession(session.sessionId)
        onStale(message)
        return true // Indicates session was stale and cleared
      }
      return false // Indicates session was not stale
    },
    []
  )

  const checkAndRotateSession = useCallback(async () => {
    if (state.session) {
      await clearStaleSession(
        state.session,
        'New day detected. A fresh workout session has started.',
        (message) => {
          dispatch({ type: 'RESET' })
          showInfo(message)
        }
      )
    }
  }, [state.session, showInfo, clearStaleSession])

  // Auto-recovery of incomplete sessions
  useEffect(() => {
    const recoverSession = async () => {
      let incompleteSession = await workoutSessionStorage.getIncompleteSession()

      if (incompleteSession) {
        const wasStale = await clearStaleSession(
          incompleteSession,
          'New day detected. Your previous session was cleared.',
          showInfo
        )
        if (wasStale) {
          incompleteSession = null
        }
      }

      if (incompleteSession) {
        dispatch({ type: 'SET_SESSION', payload: incompleteSession })
      }
      setIsInitialized(true)
    }

    if (!isInitialized) {
      recoverSession()
    }
  }, [isInitialized, showInfo, clearStaleSession])

  // Validate session on window focus
  useEffect(() => {
    window.addEventListener('focus', checkAndRotateSession)
    return () => {
      window.removeEventListener('focus', checkAndRotateSession)
    }
  }, [checkAndRotateSession])

  // Persist session changes to IndexedDB
  useEffect(() => {
    if (state.session) {
      workoutSessionStorage.saveSession(state.session)
    }
  }, [state.session, state.session?.status])

  const startWorkout = useCallback(
    (age: number, weight: number, gender?: Gender, maxHr?: number) => {
      dispatch({ type: 'START', payload: { age, weight, gender, maxHr } })
    },
    []
  )

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE' })
  }, [])

  const resumeWorkout = useCallback(() => {
    dispatch({ type: 'RESUME' })
  }, [])

  const endWorkout = useCallback(() => {
    dispatch({ type: 'END' })
  }, [])

  const resetWorkout = useCallback(async () => {
    if (state.session) {
      await workoutSessionStorage.deleteSession(state.session.sessionId)
    }
    dispatch({ type: 'RESET' })
  }, [state.session])

  const exportWorkout = useCallback(async () => {
    if (!state.session) return

    try {
      const { generateFitFile } = await import('@/services/exportService')
      const blob = await generateFitFile(state.session)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workout-${new Date(state.session.startTime).toISOString()}.fit`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showSuccess('Workout exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      showError('Failed to export workout')
    }
  }, [state.session, showSuccess, showError])

  const addHrData = useCallback((hrDataPoint: HrDataPoint) => {
    dispatch({ type: 'ADD_HR_DATA', payload: hrDataPoint })
  }, [])

  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }

    const interval = setInterval(() => {
      if (state.session?.startTime) {
        const now = Date.now()
        setDuration(Math.floor((now - state.session.startTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state.status, state.session?.startTime])

  return {
    session: state.session,
    status: state.status,
    totalCaloriesBurned: state.session?.totalCaloriesBurned ?? 0,
    isInitialized,
    duration,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    exportWorkout,
    addHrData,
  }
}
