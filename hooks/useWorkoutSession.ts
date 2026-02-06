// hooks/useWorkoutSession.ts
import { useEffect, useReducer, useCallback, useMemo, useRef } from 'react'
import {
  workoutSessionStorage,
  HrDataPoint,
} from '@/lib/workout-session-storage'
import { v4 as uuidv4 } from 'uuid'
import { HrZoneName } from '@/lib/shared/hr-zones'

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
}

const isValidSessionState = (parsed: unknown): parsed is SessionState => {
  if (!parsed || typeof parsed !== 'object') return false
  const p = parsed as Record<string, unknown>
  return (
    typeof p.status === 'string' &&
    ['idle', 'running', 'paused'].includes(p.status)
  )
}

const loadState = (): SessionState => {
  if (typeof window === 'undefined') return initialState
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (isValidSessionState(parsed)) {
        // Recalculate duration to avoid storing it
        const p = parsed as SessionState
        let duration = p.duration || 0
        const now = Date.now()

        if (p.status === 'running' && p.startTime) {
          duration = Math.floor((now - p.startTime - p.totalPaused) / 1000)
        } else if (p.status === 'paused' && p.startTime && p.pauseTime) {
          duration = Math.floor(
            (p.pauseTime - p.startTime - p.totalPaused) / 1000
          )
        }

        return {
          ...initialState,
          ...parsed,
          duration: duration > 0 ? duration : 0,
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
      payload: { now: number; sessionId: string; startCalories: number }
    }
  | { type: 'RESUME_WORKOUT'; payload: { now: number } }
  | { type: 'PAUSE_WORKOUT'; payload: { now: number } }
  | { type: 'END_WORKOUT'; payload: { now: number } }
  | { type: 'UPDATE_CALORIES'; payload: number }
  | { type: 'HYDRATE'; payload: SessionState }

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  let newState = state
  switch (action.type) {
    case 'HYDRATE':
      newState = action.payload
      break
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
    case 'RESET':
      newState = initialState
      break
  }

  return newState
}

interface WorkoutSessionOptions {
  /**
   * The total cumulative calories reported by the server.
   * Boundary: The server is the Single Source of Truth for total lifetime calories.
   */
  totalCalories?: number
  userAge?: number
  userWeight?: number
}

/**
 * useWorkoutSession manages the local workout lifecycle and persists session metadata
 * to localStorage.
 *
 * Note: While session duration and deltas (calories burned) are persisted locally for UX,
 * authoritative HRM data and cumulative totals should always be sourced from the server
 * to prevent state divergence.
 */
export const useWorkoutSession = ({
  totalCalories = 0,
  userAge = 30,
  userWeight = 70,
}: WorkoutSessionOptions) => {
  // Initialize from default initialState to avoid hydration mismatch
  const [state, dispatch] = useReducer(sessionReducer, initialState)

  // Load from storage on mount to fix hydration mismatch
  useEffect(() => {
    const loaded = loadState()
    if (loaded.status !== 'idle' || loaded.duration > 0) {
      dispatch({ type: 'HYDRATE', payload: loaded })
    }
  }, [])

  // Buffer for HR data points to reduce IndexedDB writes
  const hrDataBuffer = useRef<HrDataPoint[]>([])

  // Keep a ref to sessionId for cleanup/flush
  const sessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    sessionIdRef.current = state.sessionId
  }, [state.sessionId])

  // Side Effect: Save to Storage
  // Move side effects out of the reducer to maintain purity.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (state.status === 'idle' && state.duration === 0) {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        // Only save the essential restoration data
        const minimalState = {
          status: state.status,
          startTime: state.startTime,
          startCalories: state.startCalories,
          totalPaused: state.totalPaused,
          pauseTime: state.pauseTime,
          sessionId: state.sessionId,
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState))
      }
    } catch (e) {
      console.warn('Failed to save session state to storage', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.status,
    state.startTime,
    state.startCalories,
    state.totalPaused,
    state.pauseTime,
    state.sessionId,
  ])

  // Sync total calories
  useEffect(() => {
    const isWorkoutOver = state.status === 'idle' && state.startCalories > 0
    if (isWorkoutOver) return
    dispatch({ type: 'UPDATE_CALORIES', payload: totalCalories })
  }, [totalCalories, state.status, state.startCalories])

  // Timer Logic
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

  const flushData = useCallback(async () => {
    const currentSessionId = sessionIdRef.current
    if (hrDataBuffer.current.length === 0 || !currentSessionId) return

    const bufferToFlush = [...hrDataBuffer.current]
    hrDataBuffer.current = [] // Clear buffer immediately

    try {
      await workoutSessionStorage.appendHrData(currentSessionId, bufferToFlush)
    } catch (e) {
      console.error('Failed to flush HR data to storage', e)
    }
  }, [])

  // Periodic flush
  useEffect(() => {
    if (state.status !== 'running') return

    const interval = setInterval(() => {
      flushData()
    }, 30000) // Flush every 30 seconds

    return () => {
      clearInterval(interval)
      flushData() // Flush on unmount/status change
    }
  }, [state.status, flushData])

  const resetWorkout = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const startWorkout = useCallback(() => {
    if (state.status === 'idle') {
      const now = Date.now()
      const sessionId = uuidv4()

      // Initial IndexedDB entry
      workoutSessionStorage.saveSession({
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
      })

      dispatch({
        type: 'START_WORKOUT',
        payload: { now, sessionId, startCalories: totalCalories },
      })
    } else if (state.status === 'paused') {
      dispatch({ type: 'RESUME_WORKOUT', payload: { now: Date.now() } })
    }
  }, [state.status, totalCalories, userAge, userWeight])

  const pauseWorkout = useCallback(async () => {
    if (state.status === 'running') {
      await flushData()
      dispatch({ type: 'PAUSE_WORKOUT', payload: { now: Date.now() } })
    }
  }, [state.status, flushData])

  const endWorkout = useCallback(async () => {
    if (state.status !== 'idle') {
      await flushData()
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
  }, [state.status, state.sessionId, flushData])

  const addHrData = useCallback(
    (hr: number) => {
      if (state.status === 'running' && state.sessionId) {
        hrDataBuffer.current.push({ time: Date.now(), hr })
      }
    },
    [state.status, state.sessionId]
  )

  const caloriesBurned = useMemo(() => {
    if (state.startCalories === 0) return 0
    // Boundary: Single Source of Truth Principle.
    // The server provides 'totalCalories' (authoritative).
    // We calculate 'caloriesBurned' as a client-side derivation for the current session.
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
  }
}
