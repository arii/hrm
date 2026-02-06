// hooks/useWorkoutSession.ts
import { useEffect, useReducer, useCallback, useMemo } from 'react'
import {
  workoutSessionStorage,
  WorkoutSessionData,
} from '@/lib/workout-session-storage'
import { v4 as uuidv4 } from 'uuid'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { calculateHrZone } from '@/lib/hrm/zones'
import { isSameDay } from '@/lib/date'
import { useAppSnackbar } from './useAppSnackbar'

const STORAGE_KEY = 'hrm_dashboard:active_session'

type SessionStatus = 'idle' | 'running' | 'paused'

interface SessionState {
  status: SessionStatus
  duration: number
  calories: number
  startCalories: number
  startTime: number | null
  totalPaused: number // Total paused duration in milliseconds
  pauseTime: number | null // Timestamp when the workout was paused
  sessionId: string | null // For IndexedDB persistence
  currentSession: WorkoutSessionData | null // Full session object
}

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
  startCalories: 0,
  startTime: null,
  totalPaused: 0,
  pauseTime: null,
  sessionId: null,
  currentSession: null,
}

const isValidSessionState = (data: unknown): data is SessionState => {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>

  const hasRequiredFields =
    typeof p.status === 'string' &&
    ['idle', 'running', 'paused'].includes(p.status) &&
    typeof p.duration === 'number'

  const hasValidOptionalFields =
    (p.startTime === null || typeof p.startTime === 'number') &&
    (p.totalPaused === null || typeof p.totalPaused === 'number') &&
    (p.pauseTime === null || typeof p.pauseTime === 'number') &&
    (p.sessionId === null || typeof p.sessionId === 'string') &&
    (p.calories === undefined ||
      p.calories === null ||
      typeof p.calories === 'number') &&
    (p.startCalories === undefined || typeof p.startCalories === 'number')

  // Note: currentSession is transient/derived and not strictly persisted in localStorage in the same way,
  // or if it is, we validate it. But typically localStorage just has the metadata.
  // We'll accept it if missing.

  return hasRequiredFields && hasValidOptionalFields
}

const loadState = (): SessionState => {
  if (typeof window === 'undefined') return initialState
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (isValidSessionState(parsed)) {
        return {
          ...initialState,
          ...parsed,
          currentSession: null, // Always start null, let the effect hydrate it if needed
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load session state', e)
  }
  return initialState
}

type SessionAction =
  | { type: 'TICK'; payload: { duration: number } }
  | { type: 'RESET' }
  | {
      type: 'START_WORKOUT'
      payload: {
        now: number
        sessionId: string
        startCalories: number
        initialSession: WorkoutSessionData
      }
    }
  | { type: 'RESUME_WORKOUT'; payload: { now: number } }
  | { type: 'PAUSE_WORKOUT'; payload: { now: number } }
  | { type: 'END_WORKOUT'; payload: { now: number } }
  | { type: 'UPDATE_CALORIES'; payload: number }
  | { type: 'UPDATE_SESSION'; payload: WorkoutSessionData }

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  let newState = state
  switch (action.type) {
    case 'START_WORKOUT':
      if (state.status === 'idle') {
        newState = {
          ...state,
          status: 'running',
          duration: 0,
          startTime: action.payload.now,
          startCalories: action.payload.startCalories,
          calories: action.payload.startCalories,
          totalPaused: 0,
          pauseTime: null,
          sessionId: action.payload.sessionId,
          currentSession: action.payload.initialSession,
        }
      }
      break
    case 'RESUME_WORKOUT':
      if (state.status === 'paused') {
        const addedPaused = state.pauseTime
          ? action.payload.now - state.pauseTime
          : 0
        newState = {
          ...state,
          status: 'running',
          totalPaused: state.totalPaused + addedPaused,
          pauseTime: null,
        }
      }
      break
    case 'PAUSE_WORKOUT':
      if (state.status === 'running') {
        newState = { ...state, status: 'paused', pauseTime: action.payload.now }
      }
      break
    case 'END_WORKOUT':
      newState = { ...state, status: 'idle' }
      break
    case 'TICK':
      newState = { ...state, duration: action.payload.duration }
      break
    case 'UPDATE_CALORIES':
      newState = { ...state, calories: action.payload }
      break
    case 'UPDATE_SESSION':
      newState = { ...state, currentSession: action.payload }
      break
    case 'RESET':
      newState = initialState
      break
  }

  return newState
}

interface WorkoutSessionOptions {
  totalCalories?: number
  userAge?: number
  userWeight?: number
}

/**
 * Manages the local workout lifecycle and persists session metadata to localStorage.
 *
 * NOTE: The server is the Single Source of Truth (SSOT) for cumulative `totalCalories`.
 * The UI calculates `caloriesBurned` as a session-level delta to prevent state divergence.
 */
export const useWorkoutSession = ({
  totalCalories = 0,
  userAge = 30,
  userWeight = 70,
}: WorkoutSessionOptions) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState, loadState)
  const { showInfo } = useAppSnackbar()

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (state.status === 'idle' && state.duration === 0) {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        // We don't persist currentSession to localStorage to avoid quota issues
        // It is persisted in IndexedDB
        const { currentSession: _, ...persistState } = state
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistState))
      }
    } catch (e) {
      console.warn('Failed to save session state to storage', e)
    }
  }, [state])

  // Handle session daily rotation and hydration
  const checkForStaleSession = useCallback(
    async (session: WorkoutSessionData) => {
      const sessionDate = new Date(session.startTime)
      const currentDate = new Date()

      if (!isSameDay(sessionDate, currentDate)) {
        console.info(
          `[WorkoutSession] Stale session from ${sessionDate.toDateString()} detected. Clearing for new day ${currentDate.toDateString()}.`
        )
        await workoutSessionStorage.deleteSession(session.sessionId)
        dispatch({ type: 'RESET' })
        showInfo('New day detected. Your previous session was cleared.')
        return true
      }
      return false
    },
    [showInfo]
  )

  // Hydrate currentSession from IDB on mount/resume if missing, and check for stale sessions
  useEffect(() => {
    if (state.sessionId && !state.currentSession) {
      workoutSessionStorage.getSession(state.sessionId).then(async (session) => {
        if (session) {
          const isStale = await checkForStaleSession(session)
          if (!isStale) {
            dispatch({ type: 'UPDATE_SESSION', payload: session })
          }
        }
      })
    } else if (state.currentSession) {
      // Also check if the currently loaded session has become stale (e.g. app left open overnight)
      // We can use a simpler check here or reuse the logic if we want to be aggressive
      // For now, let's rely on the visibility change or manual check if needed,
      // but checking on mount/update is good.
      const sessionDate = new Date(state.currentSession.startTime)
      const currentDate = new Date()
      if (!isSameDay(sessionDate, currentDate)) {
        checkForStaleSession(state.currentSession)
      }
    }
  }, [state.sessionId, state.currentSession, checkForStaleSession])

  // Check for stale session on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (state.currentSession) {
        checkForStaleSession(state.currentSession)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [state.currentSession, checkForStaleSession])

  useEffect(() => {
    const isWorkoutOver = state.status === 'idle' && state.startCalories > 0
    if (isWorkoutOver) return
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, state.status, state.startCalories])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (state.status === 'running' && state.startTime) {
      interval = setInterval(() => {
        const now = Date.now()
        // Calculate duration based on elapsed time minus total paused time
        const duration = Math.floor(
          (now - state.startTime! - state.totalPaused) / 1000
        )
        dispatch({ type: 'TICK', payload: { duration } })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status, state.startTime, state.totalPaused])

  const resetWorkout = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    if (state.status === 'idle') {
      const now = Date.now()
      const sessionId = uuidv4()

      const initialSession: WorkoutSessionData = {
        sessionId,
        startTime: now,
        endTime: null,
        status: 'running',
        hrHistory: [],
        timeInZones: Object.fromEntries(
          Object.values(HrZoneName).map((zone) => [zone, 0])
        ) as Record<HrZoneName, number>,
        averageHr: 0,
        maxHr: 0,
        calorieHistory: [],
        totalCaloriesBurned: 0,
        userSettings: {
          age: userAge,
          weight: userWeight,
          maxHr: 220 - userAge,
        },
        lastSyncTime: now,
        syncStatus: 'pending',
      }

      workoutSessionStorage.saveSession(initialSession)

      dispatch({
        type: 'START_WORKOUT',
        payload: {
          now,
          sessionId,
          startCalories: totalCalories,
          initialSession,
        },
      })
    } else if (state.status === 'paused') {
      dispatch({ type: 'RESUME_WORKOUT', payload: { now: Date.now() } })
    }
  }, [state.status, totalCalories, userAge, userWeight])

  const pauseWorkout = useCallback(() => {
    if (state.status === 'running') {
      dispatch({ type: 'PAUSE_WORKOUT', payload: { now: Date.now() } })
    }
  }, [state.status])

  const endWorkout = useCallback(async () => {
    if (state.status !== 'idle') {
      const now = Date.now()
      if (state.sessionId) {
        const session = await workoutSessionStorage.getSession(state.sessionId)
        if (session) {
          await workoutSessionStorage.saveSession({
            ...session,
            status: 'finished',
            endTime: now,
          })
        }
      }
      dispatch({ type: 'END_WORKOUT', payload: { now } })
    }
  }, [state.status, state.sessionId])

  const addHrData = useCallback(
    async (hr: number) => {
      if (state.status === 'running' && state.sessionId) {
        // Optimistic update to local state to avoid UI lag
        // In a real scenario, we might want to just rely on the reducer update
        // but we need the previous session state to calculate deltas.
        // We can get it from state.currentSession
        const session = state.currentSession
        if (session) {
          const now = Date.now()
          const dataPoint = { time: now, hr }

          const lastDataPoint = session.hrHistory[session.hrHistory.length - 1]
          const timeDelta = lastDataPoint
            ? (now - lastDataPoint.time) / 1000
            : 1

          const { zoneName } = calculateHrZone(hr, session.userSettings.maxHr)
          const newTimeInZones = {
            ...session.timeInZones,
            [zoneName]: (session.timeInZones[zoneName] || 0) + timeDelta,
          }

          const newHrHistory = [...session.hrHistory, dataPoint]
          const newMaxHr = Math.max(session.maxHr, hr)
          const newAverageHr =
            (session.averageHr * session.hrHistory.length + hr) /
            (session.hrHistory.length + 1)

          const updatedSession: WorkoutSessionData = {
            ...session,
            hrHistory: newHrHistory,
            maxHr: newMaxHr,
            averageHr: newAverageHr,
            timeInZones: newTimeInZones,
          }

          dispatch({ type: 'UPDATE_SESSION', payload: updatedSession })
          await workoutSessionStorage.saveSession(updatedSession)
        } else {
          // Fallback if currentSession is missing for some reason (e.g. hydration lag)
          const storedSession = await workoutSessionStorage.getSession(
            state.sessionId
          )
          if (storedSession) {
            const now = Date.now()
            const dataPoint = { time: now, hr }

            const lastDataPoint =
              storedSession.hrHistory[storedSession.hrHistory.length - 1]
            const timeDelta = lastDataPoint
              ? (now - lastDataPoint.time) / 1000
              : 1

            const { zoneName } = calculateHrZone(
              hr,
              storedSession.userSettings.maxHr
            )
            const newTimeInZones = {
              ...storedSession.timeInZones,
              [zoneName]:
                (storedSession.timeInZones[zoneName] || 0) + timeDelta,
            }

            const newHrHistory = [...storedSession.hrHistory, dataPoint]
            const newMaxHr = Math.max(storedSession.maxHr, hr)
            const newAverageHr =
              (storedSession.averageHr * storedSession.hrHistory.length + hr) /
              (storedSession.hrHistory.length + 1)

            const updatedSession: WorkoutSessionData = {
              ...storedSession,
              hrHistory: newHrHistory,
              maxHr: newMaxHr,
              averageHr: newAverageHr,
              timeInZones: newTimeInZones,
            }

            dispatch({ type: 'UPDATE_SESSION', payload: updatedSession })
            await workoutSessionStorage.saveSession(updatedSession)
          }
        }
      }
    },
    [state.status, state.sessionId, state.currentSession]
  )

  const caloriesBurned = useMemo(() => {
    if (state.startCalories === 0) return 0
    const burned = Math.round(state.calories - state.startCalories)
    return burned > 0 ? burned : 0
  }, [state.calories, state.startCalories])

  return {
    workoutDuration: state.duration,
    caloriesBurned,
    startTime: state.startTime,
    resetWorkout,
    startWorkout,
    pauseWorkout,
    endWorkout,
    addHrData,
    workoutStatus: state.status,
    hasStarted: state.startTime !== null,
    sessionId: state.sessionId,
    currentSession: state.currentSession,
  }
}
