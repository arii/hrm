/**
 * Represents a single, summarized workout session.
 * This is a lightweight version suitable for history lists.
 */
export interface WorkoutSessionSummary {
  id: string
  date: string // ISO 8601 format
  name: string
  duration: number // in seconds
  avgHr: number
  maxHr: number
}

/**
 * Represents the detailed data for a workout session,
 * including timeseries data for HR, zones, etc.
 */
export interface WorkoutSession extends WorkoutSessionSummary {
  // TODO: Define the detailed structure for workout data,
  // e.g., timeseries arrays for HR, speed, cadence, etc.
  hrData?: [number, number][] // Example: [[timestamp, heartrate]]
  zoneData?: Record<string, number> // Example: { Z1: 120, Z2: 300, ... }
}
