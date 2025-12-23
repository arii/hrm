// types/workout.ts

/**
 * Represents a single recorded heart rate measurement.
 */
export interface HrmDataPoint {
  timestamp: number // Unix timestamp (ms)
  value: number // Heart rate in BPM
}

import { TimerPhase } from './core'

/**
 * Represents a significant event in the timer's lifecycle.
 */
export interface TimerEvent {
  timestamp: number // Unix timestamp (ms)
  phase: TimerPhase
  duration: number // Duration of the phase in seconds
}

/**
 * Represents a complete workout session, from start to finish.
 */
export interface WorkoutSession {
  id: string // Unique identifier for the session
  startTime: number // Unix timestamp (ms)
  endTime: number // Unix timestamp (ms)
  timerEvents: TimerEvent[]
  hrmDataPoints: HrmDataPoint[]
}
