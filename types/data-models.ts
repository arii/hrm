/**
 * @file This file contains the centralized data models for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */

/**
 * Represents a user's profile information.
 *
 * @property {string} id - The unique identifier for the user (UUID).
 * @property {string} username - The user's chosen username. Must be unique.
 * @property {string} email - The user's email address. Must be unique.
 * @property {string | null} firstName - The user's first name.
 * @property {string | null} lastName - The user's last name.
 * @property {string} createdAt - The timestamp when the user was created (ISO 8601).
 * @property {string} updatedAt - The timestamp when the user was last updated (ISO 8601).
 */
export interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Represents a single workout session.
 *
 * @property {string} id - The unique identifier for the workout session (UUID).
 * @property {string} userId - The ID of the user who performed the workout.
 * @property {string} startedAt - The timestamp when the workout started (ISO 8601).
 * @property {string | null} endedAt - The timestamp when the workout ended (ISO 8601).
 * @property {string} notes - Any notes the user added for the workout.
 */
// @knip-ignore
export interface WorkoutSession {
  id: string
  userId: string
  startedAt: string
  endedAt: string | null
  notes: string
}

/**
 * Represents a single heart rate data point.
 *
 * @property {string} id - The unique identifier for the data point (UUID).
 * @property {string} workoutSessionId - The ID of the workout session this data point belongs to.
 * @property {number} timestamp - The Unix epoch milliseconds when the heart rate was measured.
 * @property {number} heartRate - The heart rate in beats per minute.
 */
// @knip-ignore
export interface HeartRateDataPoint {
  id: string
  workoutSessionId: string
  timestamp: number
  heartRate: number
}
