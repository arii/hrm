import { useReducer, useEffect, useCallback, useState } from 'react'
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

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: WorkoutStatus
}

type SessionManagerAction =
  | { type: 'SET_SESSION'; payload: WorkoutSessionData }
  | { type: 'START'; payload: { age: number; weight: number; maxHr?: number } }
  | { type: 'RESUME' }
  | { type: 'PAUSE' }
  | { type: 'FINISH' }
  | { type: 'RESET' }
  | { type: 'ADD_HR_DATA'; payload: HrDataPoint }
  | { type: 'UPDATE_CALORIES'; payload: number }

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
      const { age, weight, maxHr: providedMaxHr } = action.payload
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
        userSettings: { age, weight, maxHr },
        lastSyncTime: Date.now(),
        syncStatus: 'pending',
        totalPausedTime: 0,
        lastPauseTime: undefined,
      }
      return {
        ...state,
        session: newSession,
        status: 'running',
      }
    }
    case 'RESUME': {
      if (!state.session) return state
      // If resuming, calculate time spent paused and add to totalPausedTime
      let newTotalPausedTime = state.session.totalPausedTime || 0
      if (state.session.lastPauseTime) {
        newTotalPausedTime += Date.now() - state.session.lastPauseTime
      }

      return {
        ...state,
        session: {
          ...state.session,
          status: 'running',
          totalPausedTime: newTotalPausedTime,
          lastPauseTime: undefined,
        },
        status: 'running',
      }
    }
    case 'PAUSE': {
      if (!state.session || state.status !== 'running') return state
      return {
        ...state,
        session: {
          ...state.session,
          status: 'paused',
          lastPauseTime: Date.now(),
        },
        status: 'paused',
      }
    }
    case 'FINISH': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
          lastPauseTime: undefined, // clear it
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
    case 'UPDATE_CALORIES': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          totalCaloriesBurned: action.payload,
        },
      }
    }
    default:
      return state
  }
}

export const useWorkoutSessionManager = () => {
  const [state, dispatch] = useReducer(sessionManagerReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)
  const { showInfo } = useAppSnackbar()

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

  useEffect(() => {
    window.addEventListener('focus', checkAndRotateSession)
    return () => {
      window.removeEventListener('focus', checkAndRotateSession)
    }
  }, [checkAndRotateSession])

  useEffect(() => {
    if (state.session) {
      workoutSessionStorage.saveSession(state.session)
    }
  }, [state.session])

  const startWorkout = useCallback(
    (age: number, weight: number, maxHr?: number) => {
      dispatch({ type: 'START', payload: { age, weight, maxHr } })
    },
    []
  )

  const resumeWorkout = useCallback(() => {
    dispatch({ type: 'RESUME' })
  }, [])

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE' })
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
    dispatch({ type: 'UPDATE_CALORIES', payload: calories })
  }, [])

  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const calculateDuration = () => {
      if (state.session?.startTime) {
        const now = state.session.endTime || Date.now()
        const totalPaused = state.session.totalPausedTime || 0
        const currentPauseDuration =
          state.status === 'paused' && state.session.lastPauseTime
            ? now - state.session.lastPauseTime
            : 0

        return Math.max(
          0,
          Math.floor(
            (now -
              state.session.startTime -
              totalPaused -
              currentPauseDuration) /
              1000
          )
        )
      }
      return 0
    }

    // Schedule update to avoid sync state update in effect
    const timeout = setTimeout(() => {
      setDuration(calculateDuration())
    }, 0)

    if (state.status !== 'running') {
      return () => clearTimeout(timeout)
    }

    const interval = setInterval(() => {
      setDuration(calculateDuration())
    }, 1000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [
    state.status,
    state.session?.startTime,
    state.session?.totalPausedTime,
    state.session?.lastPauseTime,
    state.session?.endTime,
  ])

  return {
    session: state.session,
    status: state.status,
    isInitialized,
    duration,
    startWorkout,
    resumeWorkout,
    pauseWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
    updateCalories,
  }
}
