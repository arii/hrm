import Database from 'better-sqlite3'
import logger from '../utils/logger'
import { env } from './env'

// Determine the database path. Use an in-memory database for tests.
const dbPath =
  env.NODE_ENV === 'test' ? ':memory:' : env.DATABASE_PATH || 'hrm-data.db'

// Initialize the database connection.
const db = new Database(dbPath, {
  // verbose: env.NODE_ENV === 'development' ? logger.info : undefined,
})

// Enable Write-Ahead Logging for better concurrency.
db.pragma('journal_mode = WAL')
logger.info(`🗄️ Database connected at ${dbPath}`)

/**
 * Initializes the database schema.
 * This function should be called on application startup.
 */
export const initDb = () => {
  logger.info('🗄️ Initializing database schema...')

  const createWorkoutSessionsTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT,
      date TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  createWorkoutSessionsTable.run()

  // Add indexes for common query patterns
  const createIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_workout_sessions_userId ON workout_sessions(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);`,
  ]

  createIndexes.forEach((sql) => {
    db.prepare(sql).run()
  })

  logger.info('✅ Database schema initialized.')
}

/**
 * Gracefully closes the database connection.
 * Call this on application shutdown.
 */
export const closeDb = () => {
  if (db) {
    logger.info('🗄️ Closing database connection...')
    db.close()
    logger.info('✅ Database connection closed.')
  }
}

export default db
