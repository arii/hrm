// types/data-models.ts

/**
 * Distinguishes between data sources.
 * - 'legacy_import': From your Google Doc scraping (qualitative).
 * - 'live_tracking': Recorded by this app's HRM (quantitative).
 */
export type SessionSource = 'legacy_import' | 'live_tracking'

export interface WorkoutPhase {
  name: string
  exercises: string[]
}

export interface WorkoutSession {
  id: string
  userId: string
  startedAt: string // ISO 8601 Date
  endedAt: string | null
  source: SessionSource

  // Summary Stats (Optional as legacy data lacks these)
  avgHr?: number
  calories?: number
  duration?: number // Seconds

  // Rich Context (Legacy data excels here)
  phases: WorkoutPhase[]
  notes?: string

  // Time-Series (Live data excels here)
  samples?: HeartRateDataPoint[]
}

// ... existing HeartRateDataPoint and UserProfile interfaces ...
export interface HeartRateDataPoint {
  id: string
  workoutSessionId: string
  timestamp: number
  heartRate: number
}
