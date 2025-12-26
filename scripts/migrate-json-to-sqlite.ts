// scripts/migrate-json-to-sqlite.ts
import fs from 'fs'
import path from 'path'
import { db } from '../services/database.js'
import logger from '../utils/logger.js'

const JSON_DB_PATH = path.join(process.cwd(), 'logs', 'hrm_sessions.json')

interface MeasurementRecord {
  timestamp: number
  bpm: number
}

interface SessionRecord {
  sessionId: string
  userName: string
  startTime: number
  endTime: number
  measurements: MeasurementRecord[]
}

const migrate = () => {
  if (!fs.existsSync(JSON_DB_PATH)) {
    logger.info('No JSON database file found. Skipping migration.')
    return
  }

  const jsonData = fs.readFileSync(JSON_DB_PATH, 'utf-8')
  const sessions: SessionRecord[] = JSON.parse(jsonData)

  const insertSession = db.prepare(
    'INSERT INTO sessions (id, user_name, start_time, end_time) VALUES (?, ?, ?, ?)'
  )
  const insertMeasurement = db.prepare(
    'INSERT INTO measurements (session_id, timestamp, bpm) VALUES (?, ?, ?)'
  )

  const migrateTransaction = db.transaction(() => {
    for (const session of sessions) {
      insertSession.run(
        session.sessionId,
        session.userName,
        session.startTime,
        session.endTime
      )
      for (const measurement of session.measurements) {
        insertMeasurement.run(
          session.sessionId,
          measurement.timestamp,
          measurement.bpm
        )
      }
    }
  })

  try {
    migrateTransaction()
    logger.info(
      `Successfully migrated ${sessions.length} sessions from JSON to SQLite.`
    )
  } catch (error) {
    logger.error('Failed to migrate data:', error)
  }
}

migrate()
