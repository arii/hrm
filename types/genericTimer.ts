// File: types/genericTimer.ts
/**
 * @file Defines the core types and interfaces for the GenericTimer utility service.
 * @author Jules
 */

/**
 * Represents the operational mode of the timer.
 * - `STOPWATCH`: Counts up from zero.
 * - `COUNTDOWN`: Counts down from a specified duration.
 */
export type TimerMode = 'STOPWATCH' | 'COUNTDOWN'

/**
 * Represents the current phase of the timer's lifecycle.
 * - `IDLE`: The timer is created but not running. Initial state.
 * - `RUNNING`: The timer is actively counting up or down.
 * - `PAUSED`: The timer is temporarily stopped.
 * - `FINISHED`: The timer has completed its countdown.
 */
// @knip-ignore
export type TimerPhase = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED'

/**
 * Encapsulates the complete state of a timer instance.
 */
export interface GenericTimerState {
  /** The current operational mode. */
  mode: TimerMode
  /** The current phase of the timer's lifecycle. */
  phase: TimerPhase
  /** The total duration set for a countdown timer, in milliseconds. */
  durationMs: number
  /** The elapsed time since the timer started, in milliseconds. */
  elapsedMs: number
  /** The remaining time for a countdown timer, in milliseconds. */
  remainingMs: number
  /** The timestamp when the timer was last started or resumed. Null if not running. */
  startTime: number | null
}
