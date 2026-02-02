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
import { isSameDay } from '../lib/date'

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
      return {
        ...state,
        session: { ...state.session, status: 'running' },
        status: 'running',
      }
    }
    case 'END': {
      if (!state.session) return state
      // If running, transition to 'paused'. If paused, transition to 'finished'.
      const nextStatus = state.status === 'running' ? 'paused' : 'finished'
      return {
        ...state,
        session: {
          ...state.session,
          status: nextStatus,
          // Only set endTime when the session is truly finished
          endTime: nextStatus === 'finished' ? Date.now() : null,
        },
        status: nextStatus,
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

  const checkAndRotateSession = useCallback(async () => {
    if (!state.session?.startTime) return

    const sessionDate = new Date(state.session.startTime)
    const currentDate = new Date()

    if (!isSameDay(sessionDate, currentDate)) {
      console.info(
        `[SessionManager] Date change detected on window focus. Rotating session from ${sessionDate.toDateString()} to ${currentDate.toDateString()}.`
      )
      await workoutSessionStorage.deleteSession(state.session.sessionId)
      dispatch({ type: 'RESET' })
      showInfo('New day detected. A fresh workout session has started.')
    }
  }, [state.session, showInfo])

  // Auto-recovery of incomplete sessions
  useEffect(() => {
    const recoverSession = async () => {
      let incompleteSession = await workoutSessionStorage.getIncompleteSession()

      if (incompleteSession?.startTime) {
        const sessionDate = new Date(incompleteSession.startTime)
        const currentDate = new Date()

        if (!isSameDay(sessionDate, currentDate)) {
          console.info(
            `[SessionManager] Stale session from ${sessionDate.toDateString()} detected on startup. Clearing for new day ${currentDate.toDateString()}.`
          )
          await workoutSessionStorage.deleteSession(incompleteSession.sessionId)
          showInfo('New day detected. Your previous session was cleared.')
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
  }, [isInitialized, showInfo])

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
    isInitialized,
    duration,
    startWorkout,
    resumeWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
  }
}
