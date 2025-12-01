// File: services/timer/types.ts
/**
 * Type definitions for the dual-mode timer service (Tabata & Stopwatch).
 * These types are used internally by the timer service and for communication
 * with other parts of the server.
 */

// Timer mode distinguishes between interval-based (Tabata) and continuous (Stopwatch) timing.
export type TimerMode = 'TABATA' | 'STOPWATCH'

// Timer phase represents the current state of the timer.
export type TimerPhase =
  | 'IDLE' // The timer is not running.
  | 'PREPARE' // A 5-second countdown before the main timer starts.
  | 'WORK' // The main "work" interval in Tabata mode.
  | 'REST' // The "rest" interval in Tabata mode.
  | 'RUNNING' // The timer is actively counting up in Stopwatch mode.
  | 'COOLDOWN' // A period after a workout (future implementation).

// Timer command represents the actions that can be performed on the timer.
export type TimerCommand = 'START' | 'PAUSE' | 'STOP'

// Sound cue represents the audio feedback to be played by the client.
export type SoundCue = 'WORK' | 'REST' | 'COUNTDOWN'

// Timer state represents the complete internal state of the timer service.
export interface TimerState {
  mode: TimerMode
  isRunning: boolean
  currentPhase: TimerPhase
  timeElapsed: number
  timeRemaining: number
  workDuration: number
  restDuration: number
  soundToPlay?: SoundCue
  soundEventId: number
}

// Timer configuration represents the user-configurable settings for the timer.
export interface TimerConfig {
  workDuration: number
  restDuration: number
}
