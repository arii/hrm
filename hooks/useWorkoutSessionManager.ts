// hooks/useWorkoutSessionManager.ts

import { useReducer, useEffect, useCallback, useState, useMemo, useRef } from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
  HrDataPoint,
} from '../lib/workout-session-storage'
import { WorkoutStatus } from '@/types/workout'
import {
  HeartRateZone,
  HR_ZONE_ORDER,
  calculateZoneFromMaxHr,
  toHeartRateZone,
} from '../lib/shared/hr-zones'
import { v4 as uuidv4 } from 'uuid'
import { calculateMaxHr } from '@/lib/shared/hr-zones'
import { useAppSnackbar } from './useAppSnackbar'
import { isSessionStale } from '../lib/workout-session'

// --- State, Actions, and Reducer ---

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: WorkoutStatus
  pauseTime: number | null
  startCalories: number
}

type SessionManagerAction =
  | { type: 'SET_SESSION'; payload: WorkoutSessionData }
  | {
      type: 'START'
      payload: {
        age: number
        weight: number
        maxHr?: number
        startCalories?: number
      }
    }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH' }
  | { type: 'RESET' }
  | { type: 'ADD_HR_DATA'; payload: HrDataPoint }
  | { type: 'UPDATE_CALORIES'; payload: number }

const initialState: SessionManagerState = {
  session: null,
  status: 'idle',
  pauseTime: null,
  startCalories: 0,
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
        pauseTime: action.payload.status === 'paused' ? Date.now() : null,
        startCalories: action.payload.totalCaloriesBurned, // Fallback
      }
    }
    case 'START': {
      const { age, weight, maxHr: providedMaxHr, startCalories = 0 } =
        action.payload
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
        calorieHistory: [],
        totalCaloriesBurned: startCalories,
        userSettings: { age, weight, maxHr },
        lastSyncTime: Date.now(),
        syncStatus: 'pending',
      }
      return {
        ...state,
        session: newSession,
        status: 'running',
        pauseTime: null,
        startCalories,
      }
    }
    case 'PAUSE': {
      if (!state.session || state.status !== 'running') return state
      return {
        ...state,
        status: 'paused',
        pauseTime: Date.now(),
        session: {
          ...state.session,
          status: 'paused',
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
          totalPaused,
        },
      }
    }
    case 'UPDATE_CALORIES': {
      if (!state.session || state.status === 'finished') return state
      return {
        ...state,
        session: {
          ...state.session,
          totalCaloriesBurned: action.payload,
        },
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

      const { zone } = calculateZoneFromMaxHr(
        action.payload.hr,
        state.session.userSettings.maxHr
      )
      const zoneName = toHeartRateZone(zone)
      const newTimeInZones = {
        ...state.session.timeInZones,
        [zoneName]: (state.session.timeInZones[zoneName] || 0) + timeDelta,
      }

      const newHrHistory = [...state.session.hrHistory, action.payload]
      const newMaxHr = Math.max(state.session.maxHr, action.payload.hr)
      const oldAverage = state.session.averageHr
      const oldLength = state.session.hrHistory.length
      const newAverageHr =
        (oldAverage * oldLength + action.payload.hr) / (oldLength + 1)
      return {
        ...state,
        session: {
          ...state.session,
          hrHistory: newHrHistory,
          maxHr: newMaxHr,
          averageHr: newAverageHr,
          timeInZones: newTimeInZones,
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
  const { showInfo } = useAppSnackbar()

  const lastCaloriesRef = useRef(0)

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

  // Auto-recovery
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
    (age: number, weight: number, options: { maxHr?: number; startCalories?: number } = {}) => {
      dispatch({
        type: 'START',
        payload: {
          age,
          weight,
          maxHr: options.maxHr,
          startCalories: options.startCalories ?? lastCaloriesRef.current,
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

  const addHrData = useCallback((hrDataPoint: HrDataPoint) => {
    dispatch({ type: 'ADD_HR_DATA', payload: hrDataPoint })
  }, [])

  const updateCalories = useCallback((calories: number) => {
    lastCaloriesRef.current = calories
    dispatch({ type: 'UPDATE_CALORIES', payload: calories })
  }, [])

  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }

    const interval = setInterval(() => {
      if (state.session?.startTime) {
        const now = Date.now()
        const totalPaused = state.session.totalPaused || 0
        setDuration(
          Math.floor((now - state.session.startTime - totalPaused) / 1000)
        )
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state.status, state.session?.startTime, state.session?.totalPaused])

  // Map status for compatibility
  const hasStarted = state.status !== 'idle'

  // Calculate the calories burned *during this session*.
  const caloriesBurned = useMemo(() => {
    if (state.startCalories === 0 && (state.session?.totalCaloriesBurned || 0) === 0) {
      return 0
    }
    const burned = Math.round(
      (state.session?.totalCaloriesBurned || 0) - state.startCalories
    )
    return burned > 0 ? burned : 0
  }, [state.session?.totalCaloriesBurned, state.startCalories])

  return {
    session: state.session,
    status: state.status,
    workoutStatus: state.status,
    isInitialized,
    duration,
    workoutDuration: duration,
    hasStarted,
    caloriesBurned,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
    updateCalories,
  }
}
