// File: services/timer/timerState.ts

import { TimerMode, TimerPhase } from '../../types/core'

export const DEFAULT_WORK_DURATION = 20 // seconds
export const DEFAULT_REST_DURATION = 10 // seconds
export const START_COUNTDOWN_DURATION = 5 // seconds

// Internal state structure for the dual-mode timer.
export interface DualModeTimerState {
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number // For Stopwatch mode
  timeRemaining: number // For Tabata mode & PREPARE countdown
  workDuration: number
  restDuration: number
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
  // Internal tracking properties
  _startTime: number | null
  _pausedElapsedTime: number
  _countdownMarker: string | null
  _timerInterval: NodeJS.Timeout | null
}

/**
 * Creates the initial state for the timer.
 * @returns A fresh DualModeTimerState object.
 */
export const createInitialTimerState = (): DualModeTimerState => ({
  mode: 'TABATA',
  isRunning: false,
  currentPhase: 'IDLE',
  timeElapsed: 0,
  timeRemaining: DEFAULT_WORK_DURATION,
  workDuration: DEFAULT_WORK_DURATION,
  restDuration: DEFAULT_REST_DURATION,
  soundEventId: 0,
  _startTime: null,
  _pausedElapsedTime: 0,
  _countdownMarker: null,
  _timerInterval: null,
})
