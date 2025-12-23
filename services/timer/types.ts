// File: services/timer/types.ts

import { TimerMode, TimerPhase } from '../../types/core'

/**
 * Represents the complete state of the timer at any given moment.
 * This is the "read model" in our CQRS Lite approach.
 */
export interface TimerState {
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number // For Stopwatch mode
  timeRemaining: number // For Tabata/countdown modes
  workDuration: number
  restDuration: number
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
  // Internal state for accurate timekeeping
  startTime: number
  pausedElapsedTime: number
}

// --- Timer Events (Commands) ---

/**
 * Defines all possible state mutations for the timer.
 * In CQRS, these are the "commands" that drive state changes.
 */
export type TimerEvent =
  | { type: 'START_TIMER'; startTime: number }
  | { type: 'PAUSE_TIMER' }
  | { type: 'STOP_TIMER' }
  | { type: 'TICK' }
  | {
      type: 'CONFIGURE_TIMER'
      payload: { workDuration: number; restDuration: number }
    }
  | { type: 'SET_MODE'; mode: TimerMode }
