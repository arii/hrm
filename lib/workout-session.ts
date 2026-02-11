// lib/workout-session.ts

import { isSameDay } from './date.js'
import { WorkoutSessionData } from './workout-session-storage.js'

/**
 * Checks if a workout session is stale (i.e., from a previous day).
 * @param session The workout session to check.
 * @returns True if the session is stale, false otherwise.
 */
export const isSessionStale = (session: WorkoutSessionData): boolean => {
  const sessionDate = new Date(session.startTime)
  const currentDate = new Date()
  return !isSameDay(sessionDate, currentDate)
}
