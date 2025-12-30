// services/HrmDataLogger.ts
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger.js'

const LOG_DIR = path.join(process.cwd(), 'logs', 'hrm_sessions')

export interface HrmDataLogEntry {
  timestamp: string
  value: number
}

export class HrmDataLogger {
  private activeSessions: Map<
    string,
    { sessionId: string; stream: fs.WriteStream }
  > = new Map()

  constructor() {
    // Ensure the logs directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
  }

  public startSession(clientId: string) {
    const sessionId = `${new Date().toISOString()}_${clientId}_${uuidv4()}`
    const logFilePath = path.join(LOG_DIR, `${sessionId}.jsonl`)

    const stream = fs.createWriteStream(logFilePath, { flags: 'a' })
    stream.on('error', (err) => {
      logger.error(
        { error: err, sessionId },
        'Error writing to HRM session log file'
      )
    })

    this.activeSessions.set(clientId, { sessionId, stream })
    logger.info({ clientId, sessionId }, 'HRM session started')
  }

  public endSession(clientId: string) {
    const session = this.activeSessions.get(clientId)
    if (session) {
      session.stream.end()
      this.activeSessions.delete(clientId)
      logger.info(
        { clientId, sessionId: session.sessionId },
        'HRM session ended'
      )
    }
  }

  public log(clientId: string, value: number | null) {
    if (value === null) {
      return // Do not log null values
    }
    const session = this.activeSessions.get(clientId)
    if (session) {
      const logEntry: HrmDataLogEntry = {
        timestamp: new Date().toISOString(),
        value,
      }
      session.stream.write(JSON.stringify(logEntry) + '\n')
    }
  }
}
