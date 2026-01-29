// lib/sessionDataValidator.ts
import { HrZoneName } from '@/utils/hr-zones'

/**
 * The latest schema version for workout session data.
 * Increment this version whenever the structure of `WorkoutSessionData` changes.
 */
export const LATEST_SCHEMA_VERSION = 1

// Define the structure of a single heart rate data point
export interface HrDataPoint {
  time: number
  hr: number
  zone: HrZoneName
}

// Define the structure for calorie data points
export interface CalorieDataPoint {
  time: number
  calories: number
}

// Define the structure for the entire workout session
export interface WorkoutSessionData {
  schemaVersion: number
  id: string // Unique identifier for the session
  startTime: number
  endTime: number | null
  status: 'running' | 'paused' | 'finished'
  hrHistory: HrDataPoint[]
  calorieHistory: CalorieDataPoint[]
  timeInZones: Record<HrZoneName, number>
}

/**
 * The default state for a new workout session.
 */
export const createNewSession = (): WorkoutSessionData => ({
  schemaVersion: LATEST_SCHEMA_VERSION,
  id: `workout_${Date.now()}`,
  startTime: Date.now(),
  endTime: null,
  status: 'running',
  hrHistory: [],
  calorieHistory: [],
  timeInZones: {
    [HrZoneName.WarmUp]: 0,
    [HrZoneName.FatBurn]: 0,
    [HrZoneName.Cardio]: 0,
    [HrZoneName.Peak]: 0,
    [HrZoneName.Max]: 0,
    [HrZoneName.NoData]: 0,
    [HrZoneName.Unknown]: 0,
  },
})

/**
 * Validates and migrates raw session data from storage to the latest schema.
 *
 * @param rawData - The raw data retrieved from `localStorage`.
 * @returns A valid `WorkoutSessionData` object, either migrated or a new one.
 */
export const validateAndMigrateSessionData = (
  rawData: unknown
): WorkoutSessionData | null => {
  if (
    typeof rawData !== 'object' ||
    rawData === null ||
    !('id' in rawData) ||
    !('startTime' in rawData)
  ) {
    // Basic structural check failed, data is invalid
    return null
  }

  const session = rawData as Partial<WorkoutSessionData>

  // Migration logic based on schema version
  const version =
    'schemaVersion' in session && typeof session.schemaVersion === 'number'
      ? session.schemaVersion
      : 0 // Assume version 0 if not present

  if (version < LATEST_SCHEMA_VERSION) {
    // Example Migration: If schema version 1 adds the `calorieHistory` field
    if (!('calorieHistory' in session)) {
      session.calorieHistory = []
    }
    // In a real-world scenario, you might have more complex migrations here
  }

  // Final validation to ensure all required fields are present
  if (
    !session.id ||
    !session.startTime ||
    !session.hrHistory ||
    !session.calorieHistory ||
    !session.timeInZones
  ) {
    return null
  }

  session.schemaVersion = LATEST_SCHEMA_VERSION

  return session as WorkoutSessionData
}
