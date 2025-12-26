// services/database.ts
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger'

const DB_DIR = path.join(process.cwd(), 'logs')
const DB_PATH = path.join(DB_DIR, 'hrm-data.db')

class DatabaseService {
  private static instance: Database.Database

  private constructor() {}

  public static getInstance(): Database.Database {
    if (!DatabaseService.instance) {
      // Ensure the directory exists
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
      }

      const db = new Database(DB_PATH)
      logger.info(`Database connected at ${DB_PATH}`)

      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL')
      logger.info('SQLite WAL mode enabled.')

      // Set synchronous mode to NORMAL for performance
      db.pragma('synchronous = NORMAL')

      DatabaseService.instance = db
      DatabaseService.initializeSchema(db)
    }
    return DatabaseService.instance
  }

  private static initializeSchema(db: Database.Database): void {
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        avg_bpm INTEGER,
        total_calories INTEGER,
        device_id TEXT
      );
    `
    const createSessionsIndex = `
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    `
    const createMeasurementsTable = `
      CREATE TABLE IF NOT EXISTS measurements (
        session_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        bpm INTEGER NOT NULL,
        calories_accumulated REAL,
        zone_label TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `
    const createMeasurementsSessionIndex = `
      CREATE INDEX IF NOT EXISTS idx_measurements_session ON measurements(session_id);
    `
    const createMeasurementsTimeIndex = `
      CREATE INDEX IF NOT EXISTS idx_measurements_time ON measurements(timestamp);
    `
    db.exec(createSessionsTable)
    db.exec(createSessionsIndex)
    db.exec(createMeasurementsTable)
    db.exec(createMeasurementsSessionIndex)
    db.exec(createMeasurementsTimeIndex)

    logger.info('Database schema initialized.')
  }
}

export const db = DatabaseService.getInstance()
