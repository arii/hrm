// File: services/timer/reducer.ts
import { TimerEvent } from './events'
import { TimerMode, TimerPhase } from '../../types/websocket'

/**
 * @fileoverview Implements the core state management logic for the timer
 * using a pure reducer function. This function calculates the next state
 * based on the current state and a given event, without any side effects.
 */

// --- Constants ---
const DEFAULT_WORK_DURATION = 20 // seconds
const DEFAULT_REST_DURATION = 10 // seconds
const PREPARE_DURATION = 5 // seconds

// --- State Interface ---

/**
 * Represents the complete state of the timer at any given moment.
 */
export interface TimerState {
  mode: TimerMode
  phase: TimerPhase
  isRunning: boolean
  timeRemaining: number
  workDuration: number
  restDuration: number
  timeElapsed: number
  lastTickedAt: number | null // Timestamp of the last tick event
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
  countdownMarker: string | null
}

// --- Initial State ---

/**
 * The state of the timer when it is first created or after it has been stopped.
 */
export const initialState: TimerState = {
  mode: 'TABATA',
  phase: 'IDLE',
  isRunning: false,
  timeRemaining: DEFAULT_WORK_DURATION,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  timeElapsed: 0,
  lastTickedAt: null,
  soundEventId: 0,
  countdownMarker: null,
}

// --- Helper Functions ---

/**
 * Transitions the timer to the next phase based on the current phase.
 * This is a pure function that returns a partial state update.
 * @param currentState - The current state of the timer.
 * @returns A partial TimerState object representing the changes for the new phase.
 */
function transitionPhase(currentState: TimerState): Partial<TimerState> {
  switch (currentState.phase) {
    case 'PREPARE':
      if (currentState.mode === 'STOPWATCH') {
        return {
          phase: 'RUNNING',
          timeElapsed: 0,
          soundToPlay: 'WORK',
          soundEventId: currentState.soundEventId + 1,
          countdownMarker: null,
        }
      }
      return {
        phase: 'WORK',
        timeRemaining: currentState.workDuration,
        soundToPlay: 'WORK',
        soundEventId: currentState.soundEventId + 1,
        countdownMarker: null,
      }
    case 'WORK':
      return {
        phase: 'REST',
        timeRemaining: currentState.restDuration,
        soundToPlay: 'REST',
        soundEventId: currentState.soundEventId + 1,
        countdownMarker: null,
      }
    case 'REST':
      return {
        phase: 'WORK',
        timeRemaining: currentState.workDuration,
        soundToPlay: 'WORK',
        soundEventId: currentState.soundEventId + 1,
        countdownMarker: null,
      }
    default:
      return {}
  }
}

// --- Reducer ---

/**
 * The main reducer function for the timer. It takes the current state and an event,
 * and returns the new state. This function is pure and has no side effects.
 *
 * @param state - The current state of the timer.
 * @param event - The event to process.
 * @returns The new state of the timer.
 */
export function reducer(state: TimerState, event: TimerEvent): TimerState {
  switch (event.type) {
    case 'START':
      if (state.isRunning) {
        return state
      }
      const startTime = event.timestamp
      if (state.phase === 'IDLE') {
        return {
          ...state,
          isRunning: true,
          phase: 'PREPARE',
          timeRemaining: PREPARE_DURATION,
          lastTickedAt: startTime,
        }
      }
      return {
        ...state,
        isRunning: true,
        lastTickedAt: startTime,
      }

    case 'PAUSE':
      return {
        ...state,
        isRunning: false,
        lastTickedAt: null,
      }

    case 'STOP':
      return {
        ...initialState,
        // Preserve mode and configuration across stops
        mode: state.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
        timeRemaining:
          state.mode === 'TABATA' ? state.workDuration : 0,
      }

    case 'TICK':
      if (!state.isRunning) {
        return state
      }

      let newState = { ...state, soundToPlay: undefined }

      // Stopwatch mode: count up
      if (state.mode === 'STOPWATCH' && state.phase === 'RUNNING') {
        const timeSinceLastTick =
          (event.timestamp - (state.lastTickedAt ?? event.timestamp)) / 1000
        newState.timeElapsed += timeSinceLastTick
      }

      // Countdown modes (PREPARE, WORK, REST)
      if (
        state.phase === 'PREPARE' ||
        state.phase === 'WORK' ||
        state.phase === 'REST'
      ) {
        newState.timeRemaining -= 1
        if (newState.timeRemaining <= 0) {
          newState = { ...newState, ...transitionPhase(state) }
        } else {
          // Play countdown sound for the last 3 seconds
          const marker = `${newState.phase}-${newState.timeRemaining}`
          if (
            newState.timeRemaining >= 1 &&
            newState.timeRemaining <= 3 &&
            newState.countdownMarker !== marker
          ) {
            newState.soundToPlay = 'COUNTDOWN'
            newState.soundEventId += 1
            newState.countdownMarker = marker
          }
        }
      }

      return { ...newState, lastTickedAt: event.timestamp }

    case 'SET_MODE':
      if (state.isRunning) {
        // Do not change mode while running
        return state
      }
      return {
        ...initialState,
        mode: event.mode,
        workDuration: state.workDuration,
        restDuration: state.restDuration,
        timeRemaining:
          event.mode === 'TABATA' ? state.workDuration : 0,
      }

    case 'SET_CONFIG':
      const newWorkDuration = Math.max(1, Math.floor(event.workDuration))
      const newRestDuration = Math.max(0, Math.floor(event.restDuration))
      const configState = {
        ...state,
        workDuration: newWorkDuration,
        restDuration: newRestDuration,
      }
      // If idle, update the time remaining to the new work duration
      if (!state.isRunning && state.phase === 'IDLE') {
        configState.timeRemaining = newWorkDuration
      }
      return configState

    default:
      return state
  }
}
