// File: services/timer/reducer.ts
import { TimerMode, TimerPhase } from '../../types/websocket'

// --- Constants ---
export const PREPARE_DURATION = 5000 // 5 seconds
export const DEFAULT_WORK_DURATION = 20000 // 20 seconds
export const DEFAULT_REST_DURATION = 10000 // 10 seconds

// --- State ---
export interface TimerState {
  mode: TimerMode
  phase: TimerPhase
  isRunning: boolean
  startTime: number // Unix timestamp (ms)
  timeRemaining: number // ms
  workDuration: number // ms
  restDuration: number // ms
  targetDuration: number | null
}

export const initialState: TimerState = {
  mode: 'TABATA',
  phase: 'IDLE',
  isRunning: false,
  startTime: 0,
  timeRemaining: 0,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  targetDuration: null,
}

// --- Events ---
export type TimerEvent =
  | { type: 'START'; startTime: number }
  | { type: 'PAUSE'; pauseTime: number }
  | { type: 'STOP'; stopTime: number }
  | { type: 'SET_MODE'; mode: TimerMode }
  | {
      type: 'SET_CONFIG'
      workDuration: number
      restDuration: number
    }
  | { type: 'TICK' } // For internal phase transitions

// --- Reducer ---
export function reducer(state: TimerState, event: TimerEvent): TimerState {
  switch (event.type) {
    case 'START': {
      if (state.isRunning) return state

      const isResuming = state.phase !== 'IDLE' || state.timeRemaining > 0
      let duration: number
      let phase: TimerPhase = state.phase

      if (state.mode === 'STOPWATCH') {
        phase = 'IDLE'
        return {
          ...state,
          isRunning: true,
          startTime: event.startTime,
          phase,
        }
      }

      if (isResuming) {
        duration = state.timeRemaining
      } else {
        phase = 'PREPARE'
        duration = PREPARE_DURATION
      }

      return {
        ...state,
        isRunning: true,
        startTime: event.startTime,
        phase,
        targetDuration: duration,
      }
    }
    case 'PAUSE': {
      if (!state.isRunning) return state

      let timeRemaining: number
      if (state.mode === 'STOPWATCH') {
        timeRemaining = state.timeRemaining + (event.pauseTime - state.startTime)
      } else {
        const elapsedTime = event.pauseTime - state.startTime
        timeRemaining = Math.max(0, (state.targetDuration ?? 0) - elapsedTime)
      }

      return {
        ...state,
        isRunning: false,
        timeRemaining,
        targetDuration: state.mode === 'TABATA' ? timeRemaining : null,
      }
    }
    case 'STOP': {
      return {
        ...initialState,
        mode: state.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
      }
    }
    case 'SET_MODE': {
      if (state.mode === event.mode) return state
      return {
        ...initialState,
        mode: event.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
      }
    }
    case 'SET_CONFIG': {
      const newState: TimerState = {
        ...state,
        workDuration: event.workDuration,
        restDuration: event.restDuration,
      }
      if (!state.isRunning && state.phase === 'IDLE' && state.mode === 'TABATA') {
        newState.timeRemaining = event.workDuration
      }
      return newState
    }
    case 'TICK': {
      return state
    }
    default:
      return state
  }
}
