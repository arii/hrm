'use client'

import {
  useReducer,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { WorkoutStatus } from '@/types/workout'
import {
  workoutSessionStorage,
  WorkoutSessionData,
  HrDataPoint,
  HrZoneName,
} from '@/lib/workout-session-storage'
import { calculateZoneFromMaxHr, getHrZoneLabel } from '@/lib/shared/hr-zones'
import { isSessionStale } from '@/lib/workout-session'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import logger from '@/utils/logger'

interface WorkoutSessionState {
  status: WorkoutStatus
  startTime: number | null
  pauseStartTime: number | null
  totalPausedTime: number
  isInitialized: boolean
  session: WorkoutSessionData | null
  savedTotalCalories: number // Calories frozen when workout ends
}

type WorkoutAction =
  | { type: 'SET_INITIALIZED'; initialized: boolean }
  | { type: 'RECOVER_SESSION'; session: WorkoutSessionData }
  | { type: 'START_WORKOUT'; age: number; weight: number; maxHr: number }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'FINISH_WORKOUT'; finalCalories: number }
  | { type: 'RESET_WORKOUT' }
  | { type: 'ADD_HR_DATA'; data: HrDataPoint }
  | { type: 'UPDATE_CALORIES'; calories: number }

const initialState: WorkoutSessionState = {
  status: 'idle',
  startTime: null,
  pauseStartTime: null,
  totalPausedTime: 0,
  isInitialized: false,
  session: null,
  savedTotalCalories: 0,
}

function workoutReducer(
  state: WorkoutSessionState,
  action: WorkoutAction
): WorkoutSessionState {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.initialized }

    case 'RECOVER_SESSION':
      return {
        ...state,
        status: action.session.status,
        startTime: action.session.startTime,
        totalPausedTime: action.session.totalPausedTime || 0,
        pauseStartTime: action.session.status === 'paused' ? Date.now() : null,
        session: action.session,
        isInitialized: true,
      }

    case 'START_WORKOUT': {
      const now = Date.now()
      return {
        ...state,
        status: 'running',
        startTime: now,
        pauseStartTime: null,
        totalPausedTime: 0,
        savedTotalCalories: 0,
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
          totalPausedTime: 0,
          userSettings: {
            age: action.age,
            weight: action.weight,
            maxHr: action.maxHr,
          },
          lastSyncTime: now,
          syncStatus: 'pending',
        },
      }
    }

    case 'PAUSE_WORKOUT':
      if (state.status !== 'running') return state
      return {
        ...state,
        status: 'paused',
        pauseStartTime: Date.now(),
        session: state.session ? { ...state.session, status: 'paused' } : null,
      }

    case 'RESUME_WORKOUT':
      if (state.status !== 'paused' || !state.pauseStartTime) return state
      const pauseDuration = Date.now() - state.pauseStartTime
      const newTotalPausedTime = state.totalPausedTime + pauseDuration
      return {
        ...state,
        status: 'running',
        totalPausedTime: newTotalPausedTime,
        pauseStartTime: null,
        session: state.session
          ? {
              ...state.session,
              status: 'running',
              totalPausedTime: newTotalPausedTime,
            }
          : null,
      }

    case 'FINISH_WORKOUT':
      if (!state.session) return state
      return {
        ...state,
        status: 'finished',
        pauseStartTime: null,
        savedTotalCalories: action.finalCalories,
        session: {
          ...state.session,
          status: 'finished',
          endTime: Date.now(),
          totalCaloriesBurned: action.finalCalories,
        },
      }

    case 'RESET_WORKOUT':
      return { ...initialState, isInitialized: true }

    case 'ADD_HR_DATA': {
      if (!state.session || state.status !== 'running') return state

      const newHrHistory = [...state.session.hrHistory, action.data]
      const newMaxHr = Math.max(state.session.maxHr, action.data.hr)
      const newAverageHr =
        newHrHistory.reduce((sum, p) => sum + p.hr, 0) / newHrHistory.length

      const { zone: zoneIndex } = calculateZoneFromMaxHr(
        action.data.hr,
        state.session.userSettings.maxHr
      )
      const zoneLabel = getHrZoneLabel(zoneIndex) as HrZoneName

      const lastPoint =
        state.session.hrHistory[state.session.hrHistory.length - 1]
      const startTime = lastPoint ? lastPoint.time : state.session.startTime
      const timeDeltaSeconds = Math.max(
        0,
        Math.floor((action.data.time - (startTime || 0)) / 1000)
      )

      const newTimeInZones = { ...state.session.timeInZones }
      newTimeInZones[zoneLabel] =
        (newTimeInZones[zoneLabel] || 0) + timeDeltaSeconds

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

    case 'UPDATE_CALORIES':
      if (
        !state.session ||
        state.session.totalCaloriesBurned === action.calories
      )
        return state
      return {
        ...state,
        session: {
          ...state.session,
          totalCaloriesBurned: action.calories,
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
  const hasInitializedRef = useRef(false)

  // Use state.savedTotalCalories if workout is finished, otherwise live delta
  const caloriesBurned = useMemo(() => {
    if (!state.startTime) return 0
    if (state.status === 'finished') return state.savedTotalCalories
    return Math.max(0, currentTotalCalories - initialCalories)
  }, [
    currentTotalCalories,
    initialCalories,
    state.startTime,
    state.status,
    state.savedTotalCalories,
  ])

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
    if (
      state.session &&
      (state.status === 'running' || state.status === 'paused')
    ) {
      dispatch({ type: 'UPDATE_CALORIES', calories: caloriesBurned })
    }
  }, [caloriesBurned, state.status, state.session?.sessionId])

  useEffect(() => {
    const persist = async () => {
      if (
        state.session &&
        state.status !== 'idle' &&
        state.status !== 'finished'
      ) {
        await workoutSessionStorage.saveSession(state.session)
      }
      if (state.status === 'finished' && state.session) {
        await workoutSessionStorage.saveSession(state.session)
      }
    }
    persist()
  }, [state.session, state.status])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

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
            // Pin initialCalories to capture the delta correctly
            setInitialCalories(currentTotalCalories - saved.totalCaloriesBurned)
          }
        } else {
          dispatch({ type: 'SET_INITIALIZED', initialized: true })
        }
      } catch (err) {
        logger.error(
          err as Error,
          'Failed to initialize workout session manager'
        )
        dispatch({ type: 'SET_INITIALIZED', initialized: true })
      }
    }
    initialize()
  }, []) // Removed currentTotalCalories from deps

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
    dispatch({ type: 'FINISH_WORKOUT', finalCalories: caloriesBurned })
  }, [caloriesBurned])

  const endWorkout = useCallback(() => {
    if (state.status === 'running') {
      pauseWorkout()
    } else if (state.status === 'paused') {
      finishWorkout()
    }
  }, [state.status, pauseWorkout, finishWorkout])

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
