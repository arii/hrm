import db from '@/lib/db'
import { logger } from '@/utils/logger'
import { WorkoutSession } from '@/types/workout'
import { StmtCache } from '@/lib/stmtCache'
import { env } from '@/lib/env'

const STATEMENTS = {
  // Read operations
  getSessionHistory: `
    SELECT
      id,
      date,
      json_extract(data, '$.name') as name,
      json_extract(data, '$.duration') as duration,
      json_extract(data, '$.avgHr') as avgHr,
      json_extract(data, '$.maxHr') as maxHr
    FROM workout_sessions
    WHERE userId = :userId
    ORDER BY date DESC
    LIMIT :limit OFFSET :offset;
  `,
  getSessionDetails: `
    SELECT id, date, data
    FROM workout_sessions
    WHERE id = :id AND userId = :userId;
  `,
  // Write operations
  saveSession: `
    INSERT INTO workout_sessions (id, userId, date, data)
    VALUES (:id, :userId, :date, :data)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      data = excluded.data;
  `,
  // Maintenance operations
  deleteOldSessions: `
    DELETE FROM workout_sessions
    WHERE createdAt < datetime('now', '-' || :retentionDays || ' days');
  `,
}

// Prepare and cache statements for performance
const stmtCache = new StmtCache(db, STATEMENTS)

/**
 * Retrieves a paginated list of workout session history for a user.
 * @param userId - The ID of the user.
 * @param limit - The number of sessions to retrieve.
 * @param offset - The starting point for retrieval.
 * @returns A promise that resolves to an array of workout sessions.
 */
export const getSessionHistory = async (
  userId: string,
  limit = 50,
  offset = 0
): Promise<WorkoutSessionSummary[]> => {
  try {
    const stmt = stmtCache.get('getSessionHistory')
    const rows = stmt.all({ userId, limit, offset }) as WorkoutSessionSummary[]
    return rows
  } catch (error) {
    logger.error('Failed to get session history from DB', {
      error,
      userId,
    })
    return [] // Return empty array on error
  }
}

/**
 * Retrieves the detailed data for a single workout session.
 * @param id - The unique identifier of the workout session.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to the workout session or null if not found.
 */
export const getSessionDetails = async (
  id: string,
  userId: string
): Promise<WorkoutSession | null> => {
  try {
    const stmt = stmtCache.get('getSessionDetails')
    const row = stmt.get({ id, userId }) as
      | { id: string; date: string; data: string }
      | undefined

    if (!row) {
      return null
    }

    return {
      id: row.id,
      date: row.date,
      ...JSON.parse(row.data),
    }
  } catch (error) {
    logger.error('Failed to get session details from DB', {
      error,
      id,
      userId,
    })
    return null
  }
}

/**
 * Saves a workout session to the database.
 * This can be used for both creating new sessions and updating existing ones.
 * @param session - The workout session data to save.
 * @returns A promise that resolves when the operation is complete.
 */
export const saveWorkoutSession = async (
  session: WorkoutSession & { userId: string }
): Promise<void> => {
  try {
    const { id, date, userId, ...rest } = session
    const data = JSON.stringify(rest)

    const stmt = stmtCache.get('saveSession')
    stmt.run({ id, userId, date, data })
  } catch (error) {
    logger.error('Failed to save workout session to DB', {
      error,
      sessionId: session.id,
      userId: session.userId,
    })
  }
}

/**
 * Deletes workout sessions that are older than the configured retention period.
 * This is intended to be called from a central management process (e.g., server startup).
 */
export const cleanupOldSessions = () => {
  try {
    const retentionDays = env.WORKOUT_DATA_RETENTION_DAYS
    logger.info(`🗄️ Deleting workout sessions older than ${retentionDays} days...`)
    const stmt = stmtCache.get('deleteOldSessions')
    const result = stmt.run({ retentionDays })
    if (result.changes > 0) {
      logger.info(`✅ Cleaned up ${result.changes} old workout sessions.`)
    }
  } catch (error) {
    logger.error('Failed to delete old workout sessions', { error })
  }
}
