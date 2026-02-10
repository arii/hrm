// hooks/useWorkoutSession.ts
import {
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  workoutSessionStorage,
  HrDataPoint,
} from '@/lib/workout-session-storage'
import { v4 as uuidv4 } from 'uuid'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { calculateHrZone } from '@/lib/hrm/zones'
import { useDebounce } from './useDebounce'
import { WorkoutStatus } from '@/types/workout'

const STORAGE_KEY = 'hrm_dashboard:active_session'
const BUFFER_STORAGE_KEY = 'hrm_dashboard:hr_buffer'

interface SessionState {
  status: WorkoutStatus
  duration: number
  calories: number
  startCalories: number
  startTime: number | null
  totalPaused: number // Total paused duration in milliseconds
  pauseTime: number | null // Timestamp when the workout was paused
  sessionId: string | null // For IndexedDB persistence
  timeInZones: Record<HrZoneName, number>
  lastActiveTime: number | null
}

const initialTimeInZones: Record<HrZoneName, number> = Object.fromEntries(
  Object.values(HrZoneName).map((zone) => [zone, 0])
) as Record<HrZoneName, number>

const initialState: SessionState = {
  status: 'idle',
  duration: 0,
  calories: 0,
  startCalories: 0,
  startTime: null,
  totalPaused: 0,
  pauseTime: null,
  sessionId: null,
  timeInZones: initialTimeInZones,
  lastActiveTime: null,
}

const isValidSessionState = (parsed: unknown): parsed is SessionState => {
  if (!parsed || typeof parsed !== 'object') return false
  const p = parsed as Record<string, unknown>
  return (
    typeof p.status === 'string' &&
    ['idle', 'running', 'paused', 'finished'].includes(p.status) &&
    typeof p.duration === 'number'
  )
}

const loadState = (): SessionState => {
  if (typeof window === 'undefined') return initialState
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (isValidSessionState(parsed)) {
        // Hydration Fix: Ensure timeInZones exists
        const timeInZones = parsed.timeInZones || initialTimeInZones

        const newState = {
          ...initialState,
          ...parsed,
          timeInZones,
        }

        // Auto-pause if session is stale (user away for > 1 min)
        if (newState.status === 'running' && newState.lastActiveTime) {
          const now = Date.now()
          if (now - newState.lastActiveTime > 60000) {
            newState.status = 'paused'
            newState.pauseTime = newState.lastActiveTime
            // We do not adjust totalPaused here; the gap is effectively "paused" time
            // which will be added to totalPaused when/if they resume.
          }
        }
        return newState
      }
    }
  } catch (e) {
    console.warn('Failed to load session state', e)
  }
  return initialState
}

type SessionAction =
  | { type: 'TICK'; payload: { duration: number; now: number } }
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
  | {
      type: 'UPDATE_ZONES'
      payload: { zone: HrZoneName; delta: number; now: number }
    }

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
      if (state.status === 'idle' || state.status === 'finished') {
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
          timeInZones: initialTimeInZones,
          lastActiveTime: action.payload.now,
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
          lastActiveTime: action.payload.now,
        }
      }
      break
    case 'PAUSE_WORKOUT':
      if (state.status === 'running') {
        newState = { ...state, status: 'paused', pauseTime: action.payload.now }
      }
      break
    case 'END_WORKOUT':
      newState = { ...state, status: 'finished' }
      break
    case 'TICK':
      newState = {
        ...state,
        duration: action.payload.duration,
        lastActiveTime: action.payload.now,
      }
      break
    case 'UPDATE_CALORIES':
      newState = { ...state, calories: action.payload }
      break
    case 'UPDATE_ZONES':
      if (state.status === 'running') {
        const { zone, delta } = action.payload
        newState = {
          ...state,
          timeInZones: {
            ...state.timeInZones,
            [zone]: (state.timeInZones[zone] || 0) + delta,
          },
          lastActiveTime: action.payload.now,
        }
      }
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
  const [hrHistory, setHrHistory] = useState<HrDataPoint[]>([])

  // Store totalCalories in a ref to avoid recreating startWorkout frequently
  const totalCaloriesRef = useRef(totalCalories)
  useEffect(() => {
    totalCaloriesRef.current = totalCalories
  }, [totalCalories])

  // Load from storage on mount to fix hydration mismatch
  useEffect(() => {
    const loaded = loadState()
    if (loaded.status !== 'idle' || loaded.duration > 0) {
      dispatch({ type: 'HYDRATE', payload: loaded })

      // Load history asynchronously if session exists
      if (loaded.sessionId) {
        workoutSessionStorage
          .getSession(loaded.sessionId)
          .then((session) => {
            if (session?.hrHistory) {
              setHrHistory(session.hrHistory)
            }
          })
          .catch((e) => console.warn('Failed to load session history', e))

        // Check for unsaved buffer from previous unload
        try {
          const bufferStr = window.localStorage.getItem(BUFFER_STORAGE_KEY)
          if (bufferStr) {
            const buffer = JSON.parse(bufferStr)
            if (Array.isArray(buffer) && buffer.length > 0) {
              workoutSessionStorage
                .appendHrData(loaded.sessionId, buffer)
                .then(() => window.localStorage.removeItem(BUFFER_STORAGE_KEY))
                .catch((e) =>
                  console.error('Failed to flush recovered buffer', e)
                )
            } else {
              window.localStorage.removeItem(BUFFER_STORAGE_KEY)
            }
          }
        } catch (e) {
          console.warn('Failed to recover buffer', e)
        }
      }
    }
  }, [])

  // Buffer for HR data points to reduce IndexedDB writes
  const hrDataBuffer = useRef<HrDataPoint[]>([])

  // Buffer for UI updates to throttle re-renders (Performance optimization)
  const pendingUIBuffer = useRef<HrDataPoint[]>([])
  const lastHistoryUpdate = useRef<number>(0)
  const lastHrTime = useRef<number | null>(null)

  // Side Effect: Save to Storage
  // Move side effects out of the reducer to maintain purity.
  // We use JSON.stringify as a stable dependency to detect structural changes
  // in the state we care about (everything except duration), preventing
  // frequent writes when only the duration (1Hz) changes.
  const serializedStateToSave = useMemo(() => {
    const { duration: _duration, ...rest } = state
    const stateToSave = { ...rest, duration: 0 }
    return JSON.stringify(stateToSave)
  }, [state])

  // Debounce the storage write to prevent high-frequency I/O (e.g. calories updates)
  const debouncedStateToSave = useDebounce(serializedStateToSave, 1000)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const parsed = JSON.parse(debouncedStateToSave)
      if (parsed.status === 'idle' && !parsed.startTime) {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        window.localStorage.setItem(STORAGE_KEY, debouncedStateToSave)
      }
    } catch (e) {
      console.warn('Failed to save session state to storage', e)
    }
  }, [debouncedStateToSave])

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
        dispatch({ type: 'TICK', payload: { duration, now } })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.status, state.startTime, state.totalPaused])

  const flushData = useCallback(async () => {
    if (hrDataBuffer.current.length === 0 || !state.sessionId) return

    const bufferToFlush = [...hrDataBuffer.current]
    hrDataBuffer.current = [] // Clear buffer immediately

    try {
      await workoutSessionStorage.appendHrData(state.sessionId, bufferToFlush)
    } catch (e) {
      console.error('Failed to flush HR data to storage', e)
      // Restore buffer on failure to try again next time
      hrDataBuffer.current = [...bufferToFlush, ...hrDataBuffer.current]
    }
  }, [state.sessionId])

  const flushUIUpdates = useCallback(() => {
    if (pendingUIBuffer.current.length > 0) {
      const points = [...pendingUIBuffer.current]
      setHrHistory((prev) => [...prev, ...points])
      pendingUIBuffer.current = []
    }
  }, [])

  // Periodic flush & Unmount flush
  useEffect(() => {
    if (state.status !== 'running') return

    const interval = setInterval(() => {
      flushData()
    }, 30000) // Flush every 30 seconds

    const handleUnload = () => {
      // Synchronous backup to localStorage to prevent data loss on tab close
      if (hrDataBuffer.current.length > 0) {
        try {
          window.localStorage.setItem(
            BUFFER_STORAGE_KEY,
            JSON.stringify(hrDataBuffer.current)
          )
        } catch (e) {
          console.error('Failed to save HR buffer to localStorage', e)
        }
      }
      flushData()
    }

    // Ensure flush on tab close/nav
    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
      flushData() // Flush on unmount/status change
    }
  }, [state.status, flushData])

  const resetWorkout = useCallback(() => {
    dispatch({ type: 'RESET' })
    lastHrTime.current = null
  }, [])

  const startWorkout = useCallback(() => {
    if (state.status === 'idle' || state.status === 'finished') {
      const now = Date.now()
      const sessionId = uuidv4()
      lastHrTime.current = now

      // Initial IndexedDB entry
      workoutSessionStorage.saveSession({
        sessionId,
        startTime: now,
        endTime: null,
        status: 'running',
        hrHistory: [],
        timeInZones: initialTimeInZones,
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
        payload: { now, sessionId, startCalories: totalCaloriesRef.current },
      })
    } else if (state.status === 'paused') {
      const now = Date.now()
      lastHrTime.current = now // Reset lastHrTime on resume to avoid jumping
      dispatch({ type: 'RESUME_WORKOUT', payload: { now } })
    }
  }, [state.status, userAge, userWeight])

  const pauseWorkout = useCallback(async () => {
    if (state.status === 'running') {
      flushUIUpdates()
      await flushData()
      dispatch({ type: 'PAUSE_WORKOUT', payload: { now: Date.now() } })
    }
  }, [state.status, flushData, flushUIUpdates])

  const endWorkout = useCallback(async () => {
    if (state.status !== 'idle') {
      flushUIUpdates()
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
  }, [state.status, state.sessionId, flushData, flushUIUpdates])

  const addHrData = useCallback(
    (hr: number) => {
      if (state.status === 'running' && state.sessionId) {
        const now = Date.now()
        const point = { time: now, hr }

        // 1. Calculate Zone and Delta
        const maxHr = 220 - userAge // Simple estimate or pass from props
        const { zoneName } = calculateHrZone(hr, maxHr)

        const prevTime = lastHrTime.current || now - 1000
        const delta = Math.max(0, (now - prevTime) / 1000)
        lastHrTime.current = now

        // 2. Add to persistence buffer
        hrDataBuffer.current.push(point)

        // 3. Add to UI buffer
        pendingUIBuffer.current.push(point)

        // 4. Update State (Zones)
        dispatch({
          type: 'UPDATE_ZONES',
          payload: { zone: zoneName, delta, now },
        })

        // 5. Throttled UI update (every 1 second)
        if (now - lastHistoryUpdate.current > 1000) {
          flushUIUpdates()
          lastHistoryUpdate.current = now
        }
      }
    },
    [state.status, state.sessionId, userAge, flushUIUpdates]
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
    hrHistory,
    timeInZones: state.timeInZones,
  }
}
