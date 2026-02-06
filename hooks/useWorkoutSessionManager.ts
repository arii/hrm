// hooks/useWorkoutSessionManager.ts

import { useReducer, useEffect, useCallback, useState } from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
  HrDataPoint,
} from '../lib/workout-session-storage'
import { HrZoneName } from '../lib/shared/hr-zones'
import { v4 as uuidv4 } from 'uuid'
import { calculateHrZone } from '../lib/hrm/zones'
import { calculateMaxHr } from '@/lib/shared/hr-zones'
import { useAppSnackbar } from './useAppSnackbar'
import { isSessionStale } from '../lib/workout-session'

// --- State, Actions, and Reducer ---

type SessionStatus = 'idle' | 'running' | 'paused' | 'finished'

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: SessionStatus
}

type SessionManagerAction =
  | { type: 'SET_SESSION'; payload: WorkoutSessionData }
  | { type: 'START'; payload: { age: number; weight: number; maxHr?: number } }
  | { type: 'RESUME' }
  | { type: 'PAUSE' }
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
      const { age, weight, maxHr: providedMaxHr } = action.payload
      const maxHr = providedMaxHr || calculateMaxHr(age)
      const initialTimeInZones = Object.fromEntries(
        Object.values(HrZoneName).map((zone) => [zone, 0])
      ) as Record<HrZoneName, number>

      const newSession: WorkoutSessionData = {
        sessionId: uuidv4(),
        startTime: Date.now(),
        endTime: null,
        totalPausedTime: 0,
        lastPauseStartTime: null,
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
      }
      return {
        ...state,
        session: newSession,
        status: 'running',
      }
    }
    case 'RESUME': {
      if (!state.session) return state
      // If we are already running, do nothing
      if (state.status === 'running') return state

      const now = Date.now()
      const additionalPausedTime = state.session.lastPauseStartTime
        ? now - state.session.lastPauseStartTime
        : 0

      return {
        ...state,
        session: {
          ...state.session,
          status: 'running',
          lastPauseStartTime: null,
          totalPausedTime: state.session.totalPausedTime + additionalPausedTime,
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
          lastPauseStartTime: Date.now(),
        },
        status: 'paused',
      }
    }
    case 'END': {
      if (!state.session) return state

      let finalTotalPaused = state.session.totalPausedTime
      if (state.status === 'paused' && state.session.lastPauseStartTime) {
        finalTotalPaused += Date.now() - state.session.lastPauseStartTime
      }

      return {
        ...state,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
          lastPauseStartTime: null,
          totalPausedTime: finalTotalPaused,
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

      const { zoneName } = calculateHrZone(
        action.payload.hr,
        state.session.userSettings.maxHr
      )
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
    dispatch({ type: 'END' })
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

  const [duration, setDuration] = useState(0)

  // Sync duration logic with state
  useEffect(() => {
    // Initial calc
    const calculateDuration = () => {
      if (!state.session) return 0
      if (state.status === 'running') {
        const now = Date.now()
        return Math.floor(
          (now - state.session.startTime - state.session.totalPausedTime) / 1000
        )
      } else if (
        state.status === 'paused' &&
        state.session.lastPauseStartTime
      ) {
        // Duration is frozen at the point of pause
        // duration = (pauseStartTime - startTime) - totalPausedTime
        return Math.floor(
          (state.session.lastPauseStartTime -
            state.session.startTime -
            state.session.totalPausedTime) /
            1000
        )
      } else if (state.status === 'finished' && state.session.endTime) {
        return Math.floor(
          (state.session.endTime -
            state.session.startTime -
            state.session.totalPausedTime) /
            1000
        )
      }
      return 0
    }

    // Using a timeout to move state update out of the effect execution phase
    // This avoids the "set-state-in-effect" warning/error
    const timer = setTimeout(() => {
      if (state.session) {
        setDuration(calculateDuration())
      } else {
        setDuration(0)
      }
    }, 0)

    let interval: NodeJS.Timeout | undefined

    if (state.status === 'running') {
      interval = setInterval(() => {
        setDuration(calculateDuration())
      }, 1000)
    }

    return () => {
      clearTimeout(timer)
      if (interval) clearInterval(interval)
    }
  }, [state.status, state.session])

  return {
    session: state.session,
    status: state.status,
    workoutStatus: state.status, // Alias for compatibility
    hasStarted: state.status !== 'idle', // Derived property
    isInitialized,
    duration,
    workoutDuration: duration, // Alias for compatibility
    startWorkout,
    resumeWorkout,
    pauseWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
  }
}
