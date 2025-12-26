// services/hrmDataService.ts
import { db } from './database.js'
import { Session, Measurement, SessionWithMeasurements } from '../types/hrm.js'
import { Statement } from 'better-sqlite3'
import { randomUUID } from 'crypto'
import logger from '../utils/logger.js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

class HrmDataService {
  private insertMeasurementStmt: Statement

  constructor() {
    const sql = `
      INSERT INTO measurements (session_id, timestamp, bpm, calories_accumulated, zone_label)
      VALUES (?, ?, ?, ?, ?)
    `
    this.insertMeasurementStmt = db.prepare(sql)
  }

  public startSession(session: Omit<Session, 'id' | 'startTime'>): string {
    const sessionId = randomUUID()
    const startTime = Date.now()
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_name, start_time, device_id)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(sessionId, session.userName, startTime, session.deviceId)
    logger.info(
      { sessionId, userName: session.userName },
      'HRM session started.'
    )
    return sessionId
  }

  public logMeasurement(
    measurement: Omit<Measurement, 'sessionId'>,
    sessionId: string
  ): void {
    this.insertMeasurementStmt.run(
      sessionId,
      measurement.timestamp,
      measurement.bpm,
      measurement.caloriesAccumulated,
      measurement.zoneLabel
    )
  }

  public endSession(
    sessionId: string,
    endTime: number,
    avgBpm: number,
    totalCalories: number
  ): void {
    const stmt = db.prepare(`
      UPDATE sessions
      SET end_time = ?, avg_bpm = ?, total_calories = ?
      WHERE id = ?
    `)
    stmt.run(endTime, avgBpm, totalCalories, sessionId)
    logger.info({ sessionId }, 'HRM session ended.')
  }

  public getSessionHistory(limit: number = 20): Session[] {
    const stmt = db.prepare(`
      SELECT
        id,
        user_name as userName,
        start_time as startTime,
        end_time as endTime,
        avg_bpm as avgBpm,
        total_calories as totalCalories,
        device_id as deviceId
      FROM sessions
      ORDER BY start_time DESC
      LIMIT ?
    `)
    return stmt.all(limit) as Session[]
  }

  public getSessionDetails(
    sessionId: string
  ): SessionWithMeasurements | undefined {
    const sessionStmt = db.prepare(`
      SELECT
        id,
        user_name as userName,
        start_time as startTime,
        end_time as endTime,
        avg_bpm as avgBpm,
        total_calories as totalCalories,
        device_id as deviceId
      FROM sessions
      WHERE id = ?
    `)
    const session = sessionStmt.get(sessionId) as Session | undefined

    if (!session) {
      return undefined
    }

    const measurementsStmt = db.prepare(`
      SELECT
        session_id as sessionId,
        timestamp,
        bpm,
        calories_accumulated as caloriesAccumulated,
        zone_label as zoneLabel
      FROM measurements
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `)
    const measurements = measurementsStmt.all(sessionId) as Measurement[]

    return { ...session, measurements }
  }

  public pruneOldData(): void {
    const cutoff = Date.now() - THIRTY_DAYS_MS
    const stmt = db.prepare('DELETE FROM sessions WHERE start_time < ?')
    const result = stmt.run(cutoff)
    if (result.changes > 0) {
      logger.info(`Pruned ${result.changes} old HRM sessions.`)
    } else {
      logger.info('No old HRM sessions to prune.')
    }
  }

  public updateSessionMetadata(sessionId: string, userName: string): void {
    const stmt = db.prepare(`
      UPDATE sessions
      SET user_name = ?
      WHERE id = ?
    `)
    stmt.run(userName, sessionId)
    logger.info({ sessionId, userName }, 'HRM session metadata updated.')
  }
}

export const hrmDataService = new HrmDataService()
