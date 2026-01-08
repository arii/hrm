// File: services/timer/timerState.ts
/**
 * Defines the state structure, constants, and initial state for the dual-mode timer.
 */
import { TimerMode, TimerPhase } from '../../types/core'

import {
  DEFAULT_WORK_DURATION,
  DEFAULT_REST_DURATION,
} from '../../utils/constants.js'

/**
 * Encapsulates the complete state of the timer, including both publicly
 * exposed properties and internal tracking variables.
 */
export interface DualModeTimerState {
  // Publicly exposed state
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number
  timeRemaining: number
  workDuration: number
  restDuration: number
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN' | undefined
  soundEventId: number

  // Internal state for timer logic
  _startTime: number | null
  _timerInterval: NodeJS.Timeout | null
  _pausedElapsedTime: number
  _countdownMarker: string | null
}

/**
 * Factory function to create the initial state for the timer.
 * Ensures a consistent starting state.
 * @returns {DualModeTimerState} A new timer state object.
 */
export function createInitialTimerState(): DualModeTimerState {
  return {
    mode: 'TABATA',
    isRunning: false,
    currentPhase: 'IDLE',
    timeElapsed: 0,
    timeRemaining: DEFAULT_WORK_DURATION,
    workDuration: DEFAULT_WORK_DURATION,
    restDuration: DEFAULT_REST_DURATION,
    soundEventId: 0,
    soundToPlay: undefined,

    // Internal state
    _startTime: null,
    _timerInterval: null,
    _pausedElapsedTime: 0,
    _countdownMarker: null,
  }
}
