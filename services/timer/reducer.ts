// File: services/timer/reducer.ts
/**
 * Pure reducer function for the dual-mode timer service.
 * This function calculates the next state of the timer based on the current
 * state and the action dispatched. It is free of side effects and is the
 * single source of truth for timer state transitions.
 */
import { TimerState, TimerMode, SoundCue } from './types'

// --- Constants ---
const DEFAULT_WORK_DURATION = 20
const DEFAULT_REST_DURATION = 10
const PREPARE_DURATION = 5

// --- Action Types ---
export type TimerAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'SET_MODE'; mode: TimerMode }
  | { type: 'SET_CONFIG'; workDuration: number; restDuration: number }

// --- Initial State ---
export const initialState: TimerState = {
  mode: 'TABATA',
  isRunning: false,
  currentPhase: 'IDLE',
  timeElapsed: 0,
  timeRemaining: DEFAULT_WORK_DURATION,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  soundEventId: 0,
}

// --- Helper Functions ---
const playSound = (state: TimerState, sound: SoundCue): TimerState => ({
  ...state,
  soundToPlay: sound,
  soundEventId: state.soundEventId + 1,
})

// --- Reducer ---
export const timerReducer = (
  state: TimerState,
  action: TimerAction
): TimerState => {
  switch (action.type) {
    case 'START':
      if (state.isRunning) return state
      if (state.currentPhase === 'IDLE') {
        return {
          ...state,
          isRunning: true,
          currentPhase: 'PREPARE',
          timeRemaining: PREPARE_DURATION,
        }
      }
      return { ...state, isRunning: true }

    case 'PAUSE': {
      if (!state.isRunning) return state
      const newState: TimerState = { ...state, isRunning: false }
      if (state.mode === 'STOPWATCH') {
        newState.currentPhase = 'IDLE'
      }
      return newState
    }
    case 'STOP':
      return {
        ...initialState,
        mode: state.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
        timeRemaining:
          state.mode === 'TABATA' ? state.workDuration : 0,
      }

    case 'TICK':
      if (!state.isRunning) return state

      // Handle countdown logic
      if (state.currentPhase !== 'RUNNING') {
        const newTimeRemaining = state.timeRemaining - 1
        if (newTimeRemaining <= 0) {
          // Transition to the next phase
          switch (state.currentPhase) {
            case 'PREPARE':
              if (state.mode === 'STOPWATCH') {
                return playSound(
                  {
                    ...state,
                    currentPhase: 'RUNNING',
                    timeElapsed: 0,
                  },
                  'WORK'
                )
              }
              return playSound(
                {
                  ...state,
                  currentPhase: 'WORK',
                  timeRemaining: state.workDuration,
                },
                'WORK'
              )
            case 'WORK':
              return playSound(
                {
                  ...state,
                  currentPhase: 'REST',
                  timeRemaining: state.restDuration,
                },
                'REST'
              )
            case 'REST':
              return playSound(
                {
                  ...state,
                  currentPhase: 'WORK',
                  timeRemaining: state.workDuration,
                },
                'WORK'
              )
            default:
              return state
          }
        }
        // Play countdown sound
        if (newTimeRemaining >= 1 && newTimeRemaining <= 3) {
          return playSound({ ...state, timeRemaining: newTimeRemaining }, 'COUNTDOWN')
        }
        return { ...state, timeRemaining: newTimeRemaining }
      }

      // Handle count-up logic
      return { ...state, timeElapsed: state.timeElapsed + 1 }

    case 'SET_MODE':
      if (state.isRunning) {
        // Stop the timer before changing the mode
        const stoppedState = timerReducer(state, { type: 'STOP' })
        return {
          ...stoppedState,
          mode: action.mode,
          timeRemaining:
            action.mode === 'TABATA'
              ? stoppedState.workDuration
              : 0,
        }
      }
      return {
        ...state,
        mode: action.mode,
        currentPhase: 'IDLE',
        timeRemaining:
          action.mode === 'TABATA' ? state.workDuration : 0,
      }

    case 'SET_CONFIG': {
      const newWorkDuration = Math.max(1, action.workDuration)
      const newRestDuration = Math.max(0, action.restDuration)
      const newState = {
        ...state,
        workDuration: newWorkDuration,
        restDuration: newRestDuration,
      }
      if (!state.isRunning && state.mode === 'TABATA') {
        newState.timeRemaining = newWorkDuration
      }
      return newState
    }
    default:
      return state
  }
}
