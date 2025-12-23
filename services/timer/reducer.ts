// File: services/timer/reducer.ts
/**
 * A pure function that calculates the next state of the timer based on the current state and a dispatched event.
 * This is the heart of the timer's state management and contains all the business logic for state transitions.
 * It adheres to the principles of a Redux-style reducer.
 */
import { TimerEvent, TimerState } from './types'

const DEFAULT_WORK_DURATION = 20
const DEFAULT_REST_DURATION = 10
const START_COUNTDOWN_DURATION = 5

export const initialState: TimerState = {
  mode: 'TABATA',
  isRunning: false,
  currentPhase: 'IDLE',
  timeElapsed: 0,
  timeRemaining: 0,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  soundEventId: 0,
  // Internal state
  startTime: 0,
  pausedElapsedTime: 0,
}

function transitionPhase(state: TimerState): TimerState {
  const newState = { ...state }
  delete newState.soundToPlay // Reset sound cue on phase change

  switch (newState.currentPhase) {
    case 'PREPARE':
      if (newState.mode === 'STOPWATCH') {
        newState.currentPhase = 'RUNNING'
        newState.timeElapsed = 0
        newState.pausedElapsedTime = 0
        newState.startTime = Date.now()
      } else {
        newState.currentPhase = 'WORK'
        newState.timeRemaining = newState.workDuration
      }
      return queueSound(newState, 'WORK')

    case 'WORK':
      newState.currentPhase = 'REST'
      newState.timeRemaining = newState.restDuration
      return queueSound(newState, 'REST')

    case 'REST':
      newState.currentPhase = 'WORK'
      newState.timeRemaining = newState.workDuration
      return queueSound(newState, 'WORK')

    case 'IDLE':
    case 'COOLDOWN':
    case 'RUNNING':
      // In these cases, transitioning means stopping the timer.
      return {
        ...initialState,
        mode: state.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
      }
  }
}

function queueSound(
  state: TimerState,
  sound: 'WORK' | 'REST' | 'COUNTDOWN'
): TimerState {
  return {
    ...state,
    soundToPlay: sound,
    soundEventId: state.soundEventId + 1,
  }
}

export function timerReducer(state: TimerState, event: TimerEvent): TimerState {
  switch (event.type) {
    case 'START_TIMER': {
      if (state.isRunning) return state

      if (state.currentPhase === 'IDLE') {
        // Universal PREPARE countdown
        return {
          ...state,
          isRunning: true,
          startTime: event.startTime,
          currentPhase: 'PREPARE',
          timeRemaining: START_COUNTDOWN_DURATION,
        }
      }
      // Resuming from pause
      return {
        ...state,
        isRunning: true,
        startTime: event.startTime,
      }
    }

    case 'PAUSE_TIMER': {
      if (!state.isRunning) return state

      const newState = { ...state, isRunning: false, startTime: 0 }
      if (state.mode === 'STOPWATCH' && state.currentPhase === 'RUNNING') {
        newState.pausedElapsedTime = state.timeElapsed
        newState.currentPhase = 'IDLE' // Stopwatch shows as IDLE when paused
      }
      return newState
    }

    case 'STOP_TIMER': {
      return {
        ...initialState,
        mode: state.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
        timeRemaining: state.mode === 'TABATA' ? state.workDuration : 0,
      }
    }

    case 'TICK': {
      if (!state.isRunning) return state

      const newState = { ...state }

      if (state.mode === 'STOPWATCH' && state.currentPhase === 'RUNNING') {
        // Stopwatch counts up
        const currentDelta = Math.floor((Date.now() - state.startTime) / 1000)
        newState.timeElapsed = state.pausedElapsedTime + currentDelta
      } else if (state.mode === 'TABATA' || state.currentPhase === 'PREPARE') {
        // Tabata and Prepare count down
        newState.timeRemaining = Math.max(0, state.timeRemaining - 1)

        if (newState.timeRemaining <= 0) {
          return transitionPhase(newState)
        }

        // Handle countdown sound cues
        const remaining = newState.timeRemaining
        if (remaining >= 1 && remaining <= 3) {
          return queueSound(newState, 'COUNTDOWN')
        }
      }
      return newState
    }

    case 'CONFIGURE_TIMER': {
      const { workDuration, restDuration } = event.payload
      const sanitizedWork = Math.max(1, Math.floor(workDuration))
      const sanitizedRest = Math.max(0, Math.floor(restDuration))

      const newState = {
        ...state,
        workDuration: sanitizedWork,
        restDuration: sanitizedRest,
      }

      if (!state.isRunning && state.mode === 'TABATA') {
        newState.timeRemaining = sanitizedWork
      }
      return newState
    }

    case 'SET_MODE': {
      if (state.isRunning) {
        // Stop timer before changing mode for safety
        state = timerReducer(state, { type: 'STOP_TIMER' })
      }
      return {
        ...state,
        mode: event.mode,
        currentPhase: 'IDLE',
        timeRemaining: event.mode === 'TABATA' ? state.workDuration : 0,
        timeElapsed: 0,
      }
    }

    default:
      return state
  }
}
