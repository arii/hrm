// hooks/useWorkoutSessionManager.ts

import {
  useReducer,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
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
import { estimateCaloriesBurned } from '../lib/calorie-estimation'
import {
  MAX_CALORIES_PER_WORKOUT,
  TIME_GAP_THRESHOLD_SECONDS,
  MIN_HR_FOR_CALORIE_CALCULATION,
} from '@/constants/calorie-thresholds'
import { Gender } from '@/types/core'

// --- State, Actions, and Reducer ---

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: WorkoutStatus
  pauseTime: number | null
}

type SessionManagerAction =
  | { type: 'SET_SESSION'; payload: WorkoutSessionData }
  | {
      type: 'START'
      payload: {
        age: number
        weight: number
        maxHr?: number
        gender?: Gender
      }
    }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH' }
  | { type: 'RESET' }
  | {
      type: 'ADD_HR_DATA'
      payload: {
        hr: number
        time: number
        caloriesDelta: number
        smoothedHr: number
        caloriesPerSecond: number
      }
    }

const initialState: SessionManagerState = {
  session: null,
  status: 'idle',
  pauseTime: null,
}

function sessionManagerReducer(
  state: SessionManagerState,
  action: SessionManagerAction
): SessionManagerState {
  switch (action.type) {
    case 'SET_SESSION': {
      if (state.status !== 'idle') return state
      return {
        ...state,
        session: action.payload,
        status: action.payload.status,
        pauseTime: action.payload.pauseTime,
      }
    }
    case 'START': {
      if (state.status !== 'idle') return state
      const { age, weight, maxHr: providedMaxHr, gender } = action.payload
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
        totalPaused: 0,
        pauseTime: null,
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
        pauseTime: null,
      }
    }
    case 'PAUSE': {
      if (!state.session || state.status !== 'running') return state
      const now = Date.now()
      return {
        ...state,
        status: 'paused',
        pauseTime: now,
        session: {
          ...state.session,
          status: 'paused',
          pauseTime: now,
        },
      }
    }
    case 'RESUME': {
      if (!state.session || state.status !== 'paused') return state
      const pauseDuration = state.pauseTime ? Date.now() - state.pauseTime : 0
      return {
        ...state,
        status: 'running',
        pauseTime: null,
        session: {
          ...state.session,
          status: 'running',
          pauseTime: null,
          totalPaused: (state.session.totalPaused || 0) + pauseDuration,
        },
      }
    }
    case 'FINISH': {
      if (!state.session) return state
      let totalPaused = state.session.totalPaused || 0
      if (state.status === 'paused' && state.pauseTime) {
        totalPaused += Date.now() - state.pauseTime
      }
      return {
        ...state,
        status: 'finished',
        pauseTime: null,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
          pauseTime: null,
          totalPaused,
        },
      }
    }
    case 'RESET': {
      return initialState
    }
    case 'ADD_HR_DATA': {
      if (!state.session || state.status !== 'running') return state

      const { hr, time, caloriesDelta, smoothedHr, caloriesPerSecond } =
        action.payload

      const lastDataPoint =
        state.session.hrHistory[state.session.hrHistory.length - 1]
      const timeDelta = lastDataPoint ? (time - lastDataPoint.time) / 1000 : 1

      // Zone calculation
      const { zone } = calculateZoneFromMaxHr(
        hr,
        state.session.userSettings.maxHr
      )
      const zoneName = toHeartRateZone(zone)
      const newTimeInZones = {
        ...state.session.timeInZones,
        [zoneName]: (state.session.timeInZones[zoneName] || 0) + timeDelta,
      }

      const newHrHistory = [...state.session.hrHistory, { time, hr }]
      const newMaxHr = Math.max(state.session.maxHr, hr)
      const oldAverage = state.session.averageHr
      const oldLength = state.session.hrHistory.length
      const newAverageHr = (oldAverage * oldLength + hr) / (oldLength + 1)

      const newTotalCalories = Math.min(
        state.session.totalCaloriesBurned + caloriesDelta,
        MAX_CALORIES_PER_WORKOUT
      )

      const newCalorieDataPoint: CalorieDataPoint = {
        time,
        hr: smoothedHr,
        caloriesPerSecond,
        totalToThisPoint: newTotalCalories,
      }
      const newCalorieHistory = [
        ...state.session.calorieHistory,
        newCalorieDataPoint,
      ]

      return {
        ...state,
        session: {
          ...state.session,
          hrHistory: newHrHistory,
          maxHr: newMaxHr,
          averageHr: newAverageHr,
          timeInZones: newTimeInZones,
          totalCaloriesBurned: newTotalCalories,
          calorieHistory: newCalorieHistory,
        },
      }
    }
    default:
      return state
  }
}

// --- The Hook ---

/**
 * Manages workout sessions with persistence and real-time state tracking.
 * Consolidated from useWorkoutSession and useWorkoutSessionManager.
 */
export const useWorkoutSessionManager = () => {
  const [state, dispatch] = useReducer(sessionManagerReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)
  const { showInfo, showSuccess, showError } = useAppSnackbar()

  // Refs for smoothing and calorie calculation
  const hrHistoryRef = useRef<number[]>([])
  const lastTimestampRef = useRef<number | null>(null)
  const ageRef = useRef<number>(30)
  const weightRef = useRef<number>(70)
  const genderRef = useRef<Gender | undefined>(undefined)
  const smoothingWindow = 5 // Configurable if needed

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
        return true
      }
      return false
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

  // Sync refs with session state (for recovery)
  useEffect(() => {
    if (state.session) {
      ageRef.current = state.session.userSettings.age
      weightRef.current = state.session.userSettings.weight
      genderRef.current = state.session.userSettings.gender
    }
  }, [state.session])

  // Auto-recovery
  useEffect(() => {
    const recoverSession = async () => {
      try {
        let incompleteSession =
          await workoutSessionStorage.getIncompleteSession()

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
      } catch (error) {
        console.error('[SessionManager] Recovery failed:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    if (!isInitialized) {
      recoverSession()
    }
  }, [isInitialized, showInfo, clearStaleSession])

  // Validate on focus
  useEffect(() => {
    window.addEventListener('focus', checkAndRotateSession)
    return () => {
      window.removeEventListener('focus', checkAndRotateSession)
    }
  }, [checkAndRotateSession])

  // Persist changes
  useEffect(() => {
    if (state.session) {
      workoutSessionStorage.saveSession(state.session)
    }
  }, [state.session, state.session?.status])

  const startWorkout = useCallback(
    (
      age: number,
      weight: number,
      options: { maxHr?: number; gender?: Gender } = {}
    ) => {
      // Initialize refs
      ageRef.current = age
      weightRef.current = weight
      genderRef.current = options.gender
      hrHistoryRef.current = []
      lastTimestampRef.current = null

      dispatch({
        type: 'START',
        payload: {
          age,
          weight,
          maxHr: options.maxHr,
          gender: options.gender,
        },
      })
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
    dispatch({ type: 'FINISH' })
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
      const { generateFitFile } = await import('@/utils/fit-export')
      const blob = generateFitFile(state.session)

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

  const addHrData = useCallback((hr: number) => {
    const now = Date.now()

    // Smoothing Logic
    hrHistoryRef.current.push(hr)
    if (hrHistoryRef.current.length > smoothingWindow) {
      hrHistoryRef.current.shift()
    }
    const sum = hrHistoryRef.current.reduce((a, b) => a + b, 0)
    const smoothedHr = sum / hrHistoryRef.current.length

    let caloriesDelta = 0
    let caloriesPerSecond = 0

    if (lastTimestampRef.current) {
      const dtSeconds = (now - lastTimestampRef.current) / 1000
      if (
        dtSeconds > 0 &&
        dtSeconds < TIME_GAP_THRESHOLD_SECONDS &&
        smoothedHr > MIN_HR_FOR_CALORIE_CALCULATION
      ) {
        const dtMinutes = dtSeconds / 60
        const totalCaloriesForInterval = estimateCaloriesBurned({
          heartRate: smoothedHr,
          age: ageRef.current,
          weightKg: weightRef.current,
          gender: genderRef.current,
          durationMinutes: dtMinutes,
        })
        caloriesDelta = totalCaloriesForInterval
        caloriesPerSecond = totalCaloriesForInterval / dtSeconds
      }
    }
    lastTimestampRef.current = now

    dispatch({
      type: 'ADD_HR_DATA',
      payload: {
        hr,
        time: now,
        caloriesDelta,
        smoothedHr,
        caloriesPerSecond: isNaN(caloriesPerSecond) ? 0 : caloriesPerSecond,
      },
    })
  }, [])

  // Map status for compatibility
  const hasStarted = state.status !== 'idle'

  // Calculate the calories burned *during this session*.
  const caloriesBurned = useMemo(() => {
    return state.session?.totalCaloriesBurned || 0
  }, [state.session?.totalCaloriesBurned])

  return {
    session: state.session,
    status: state.status,
    workoutStatus: state.status,
    isInitialized,
    hasStarted,
    caloriesBurned,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    exportWorkout,
    addHrData,
  }
}
