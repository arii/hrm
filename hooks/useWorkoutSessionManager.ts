'use client'

import {
  useReducer,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { WorkoutStatus } from '@/types/workout'
import {
  workoutSessionStorage,
  WorkoutSessionData,
  HrDataPoint,
<<<<<<< HEAD
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

<<<<<<< HEAD
// --- State, Actions, and Reducer ---

interface SessionManagerState {
  session: WorkoutSessionData | null
  status: WorkoutStatus
=======
interface WorkoutSessionState {
  status: WorkoutStatus
  startTime: number | null
  pauseStartTime: number | null
  totalPausedTime: number
  isInitialized: boolean
  session: WorkoutSessionData | null
>>>>>>> 49c2b7c1 (refactor: consolidate redundant hooks and components)
}

type WorkoutAction =
  | { type: 'SET_INITIALIZED'; initialized: boolean }
  | { type: 'RECOVER_SESSION'; session: WorkoutSessionData }
  | { type: 'START_WORKOUT'; age: number; weight: number; maxHr: number }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'RESET_WORKOUT' }
  | { type: 'ADD_HR_DATA'; data: HrDataPoint }

const initialState: WorkoutSessionState = {
  status: 'idle',
  startTime: null,
  pauseStartTime: null,
  totalPausedTime: 0,
  isInitialized: false,
  session: null,
}

function workoutReducer(
  state: WorkoutSessionState,
  action: WorkoutAction
): WorkoutSessionState {
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

    case 'RECOVER_SESSION':
      return {
        ...state,
        status: action.session.status,
        startTime: action.session.startTime,
        totalPausedTime: 0,
        pauseStartTime: action.session.status === 'paused' ? Date.now() : null,
        session: action.session,
        isInitialized: true,
      }

    case 'START_WORKOUT':
      const now = Date.now()
      return {
        ...state,
        status: 'running',
        startTime: now,
        pauseStartTime: null,
        totalPausedTime: 0,
        session: {
          sessionId: crypto.randomUUID(),
          startTime: now,
          endTime: null,
          status: 'running',
          hrHistory: [],
          timeInZones: {
            [HrZoneName.Recovery]: 0,
            [HrZoneName.WarmUp]: 0,
            [HrZoneName.FatBurn]: 0,
            [HrZoneName.Cardio]: 0,
            [HrZoneName.Peak]: 0,
            [HrZoneName.Max]: 0,
          } as Record<HrZoneName, number>,
          averageHr: 0,
          maxHr: 0,
          calorieHistory: [],
          totalCaloriesBurned: 0,
          userSettings: {
            age: action.age,
            weight: action.weight,
            maxHr: action.maxHr,
          },
          lastSyncTime: now,
          syncStatus: 'pending',
        },
      }

    case 'PAUSE_WORKOUT':
      if (state.status !== 'running') return state
      return {
        ...state,
        status: 'paused',
        pauseStartTime: Date.now(),
        session: state.session
          ? { ...state.session, status: 'paused' }
          : null,
      }

    case 'RESUME_WORKOUT':
      if (state.status !== 'paused' || !state.pauseStartTime) return state
      return {
        ...state,
        status: 'running',
        totalPausedTime:
          state.totalPausedTime + (Date.now() - state.pauseStartTime),
        pauseStartTime: null,
        session: state.session
          ? { ...state.session, status: 'running' }
          : null,
      }

    case 'FINISH_WORKOUT':
      if (!state.session) return state
      return {
        ...state,
        status: 'finished',
        pauseStartTime: null,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
        },
      }

    case 'RESET_WORKOUT':
      return { ...initialState, isInitialized: true }

    case 'ADD_HR_DATA':
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
        newHrHistory.reduce((sum, p) => sum + p.hr, 0) / newHrHistory.length

      const { zone: zoneIndex } = calculateZoneFromMaxHr(action.data.hr, state.session.userSettings.maxHr)
      const zoneLabel = getHrZoneLabel(zoneIndex) as HrZoneName

      // Calculate time delta since last point or session start
      const lastPoint = state.session.hrHistory[state.session.hrHistory.length - 1]
      const startTime = lastPoint ? lastPoint.time : state.session.startTime
      const timeDeltaSeconds = Math.max(0, Math.floor((action.data.time - (startTime || 0)) / 1000))

      const newTimeInZones = { ...state.session.timeInZones }
      newTimeInZones[zoneLabel] = (newTimeInZones[zoneLabel] || 0) + timeDeltaSeconds

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

    default:
      return state
  }
}

export function useWorkoutSessionManager(currentTotalCalories: number = 0) {
  const [state, dispatch] = useReducer(workoutReducer, initialState)
  const [duration, setDuration] = useState(0)
  const [initialCalories, setInitialCalories] = useState(0)
  const { showInfo } = useAppSnackbar()

  const caloriesBurned = useMemo(() => {
    if (!state.startTime) return 0
    return Math.max(0, currentTotalCalories - initialCalories)
  }, [currentTotalCalories, initialCalories, state.startTime])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state.status === 'running' && state.startTime) {
      const updateDuration = () => {
        const now = Date.now()
        const totalElapsedMs = now - state.startTime!
        const netDurationSeconds = Math.floor(
          (totalElapsedMs - state.totalPausedTime) / 1000
        )
        setDuration(Math.max(0, netDurationSeconds))
      }

      updateDuration()
      interval = setInterval(updateDuration, 1000)
    }
    return () => clearInterval(interval)
  }, [state.status, state.startTime, state.totalPausedTime])

  useEffect(() => {
    if (state.session && (state.status === 'running' || state.status === 'paused')) {
      state.session.totalCaloriesBurned = caloriesBurned
    }
  }, [caloriesBurned, state.session, state.status])

  useEffect(() => {
    const persist = async () => {
      if (state.session && state.status !== 'idle' && state.status !== 'finished') {
        await workoutSessionStorage.saveSession(state.session)
      }
      if (state.status === 'finished' && state.session) {
        await workoutSessionStorage.saveSession(state.session)
      }
    }
    persist()
  }, [state.session, state.status])

  useEffect(() => {
    const initialize = async () => {
      if (process.env.NEXT_PUBLIC_TESTING === 'true') {
        dispatch({ type: 'SET_INITIALIZED', initialized: true })
        return
      }

      try {
        const saved = await workoutSessionStorage.getIncompleteSession()
        if (saved) {
          if (isSessionStale(saved)) {
            await workoutSessionStorage.deleteSession(saved.sessionId)
            showInfo('New day detected. Your previous session was cleared.')
            dispatch({ type: 'SET_INITIALIZED', initialized: true })
          } else {
            dispatch({ type: 'RECOVER_SESSION', session: saved })
            setInitialCalories(currentTotalCalories - saved.totalCaloriesBurned)
          }
        } else {
          dispatch({ type: 'SET_INITIALIZED', initialized: true })
        }
      } catch (err) {
        logger.error(err as Error, 'Failed to initialize workout session manager')
        dispatch({ type: 'SET_INITIALIZED', initialized: true })
      }
    }
    initialize()
  }, [])

  useEffect(() => {
    const handleFocus = async () => {
      if (state.session && isSessionStale(state.session)) {
        const sessionId = state.session.sessionId
        dispatch({ type: 'RESET_WORKOUT' })
        await workoutSessionStorage.deleteSession(sessionId)
        showInfo('New day detected. A fresh workout session has started.')
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [state.session, showInfo])

  const startWorkout = useCallback(
    (age: number, weight: number, maxHr?: number) => {
      setInitialCalories(currentTotalCalories)
      setDuration(0)
      dispatch({
        type: 'START_WORKOUT',
        age,
        weight,
        maxHr: maxHr || 220 - age,
      })
    },
    [currentTotalCalories]
  )

  const pauseWorkout = useCallback(() => {
    dispatch({ type: 'PAUSE_WORKOUT' })
  }, [])

  const resumeWorkout = useCallback(() => {
    dispatch({ type: 'RESUME_WORKOUT' })
  }, [])

  const finishWorkout = useCallback(() => {
    dispatch({ type: 'FINISH_WORKOUT' })
  }, [])

  const endWorkout = useCallback(() => {
    if (state.status === 'running') {
      dispatch({ type: 'PAUSE_WORKOUT' })
    } else if (state.status === 'paused') {
      dispatch({ type: 'FINISH_WORKOUT' })
    }
  }, [state.status])

  const resetWorkout = useCallback(async () => {
    if (state.session) {
      await workoutSessionStorage.deleteSession(state.session.sessionId)
    }
    setInitialCalories(0)
    setDuration(0)
    dispatch({ type: 'RESET_WORKOUT' })
  }, [state.session])

  const addHrData = useCallback((data: HrDataPoint) => {
    dispatch({ type: 'ADD_HR_DATA', data })
  }, [])

  return {
    ...state,
    duration,
    caloriesBurned,
    hasStarted: state.status !== 'idle',
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    endWorkout,
    resetWorkout,
    addHrData,
  }
}
