// scripts/migrate-json-to-sqlite.ts
import fs from 'fs'
import path from 'path'
import { db } from '../services/database'
import { hrmDataService } from '../services/hrmDataService'
import logger from '../utils/logger'

const JSON_LOG_DIR = path.join(process.cwd(), 'logs')
const JSON_LOG_FILE = path.join(JSON_LOG_DIR, 'hrm-data.json')

interface JsonLogEntry {
  clientId: string
  value: number
  maxHr: number
  age: number
  calories: number
  timestamp: number
}

function migrate() {
  logger.info('Starting migration from JSON to SQLite...')

  if (!fs.existsSync(JSON_LOG_FILE)) {
    logger.info('No JSON log file found. Skipping migration.')
    return
  }

  const jsonLog = fs.readFileSync(JSON_LOG_FILE, 'utf-8')
  const entries: JsonLogEntry[] = JSON.parse(jsonLog)

  if (!Array.isArray(entries) || entries.length === 0) {
    logger.info('JSON log is empty. Skipping migration.')
    return
  }

  // Group entries by clientId to create sessions
  const sessions = new Map<string, JsonLogEntry[]>()
  for (const entry of entries) {
    if (!sessions.has(entry.clientId)) {
      sessions.set(entry.clientId, [])
    }
    sessions.get(entry.clientId)?.push(entry)
  }

  // Use a transaction for atomicity
  const transaction = db.transaction(() => {
    for (const [clientId, clientEntries] of sessions.entries()) {
      if (clientEntries.length === 0) continue

      const firstEntry = clientEntries[0]
      const lastEntry = clientEntries[clientEntries.length - 1]

      const sessionId = hrmDataService.startSession({
        userName: `User ${clientId.substring(0, 5)}`,
        deviceId: clientId,
      })

      for (const entry of clientEntries) {
        hrmDataService.logMeasurement(
          {
            timestamp: entry.timestamp,
            bpm: entry.value,
            caloriesAccumulated: entry.calories,
          },
          sessionId
        )
      }

      hrmDataService.endSession(
        sessionId,
        lastEntry.timestamp,
        0, // avgBpm placeholder
        lastEntry.calories
      )
    }
  })

  try {
    transaction()
    logger.info(`Successfully migrated ${entries.length} records from JSON to SQLite.`)
  } catch (error) {
    logger.error({ err: error }, 'Migration failed.')
  }

  // Optional: Rename the old JSON file to prevent re-running the migration
  fs.renameSync(JSON_LOG_FILE, `${JSON_LOG_FILE}.migrated`)
  logger.info(`Renamed JSON log file to ${JSON_LOG_FILE}.migrated`)
}

migrate()
