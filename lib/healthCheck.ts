// lib/healthCheck.ts
import { promises as fs } from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import logger from '../utils/logger.js'

interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    websocket: 'ok' | 'error'
    spotify: 'ok' | 'degraded' | 'error'
    tabataTimer: 'ok' | 'error'
    storage: 'ok' | 'error'
  }
  timestamp: string
}

export const performHealthCheck = async (
  wss: WebSocketServer,
  spotifyService: SpotifyPolling,
  tabataService: TabataTimer
): Promise<HealthCheckStatus> => {
  const checks = {
    websocket: 'error' as 'ok' | 'error',
    spotify: 'error' as 'ok' | 'degraded' | 'error',
    tabataTimer: 'error' as 'ok' | 'error',
    storage: 'error' as 'ok' | 'error',
  }

  // 1. WebSocket Server Check
  if (wss && wss.clients) {
    checks.websocket = 'ok'
  }

  // 2. Spotify Service Check
  if (spotifyService) {
    if (spotifyService.isReady()) {
      checks.spotify = 'ok'
    } else {
      checks.spotify = 'degraded'
    }
  }

  // 3. Tabata Timer Check
  if (tabataService) {
    checks.tabataTimer = 'ok'
  }

  // 4. Storage Check
  try {
    const testFile = path.join(process.cwd(), 'logs', 'healthcheck.tmp')
    await fs.writeFile(testFile, new Date().toISOString())
    await fs.unlink(testFile)
    checks.storage = 'ok'
  } catch (error) {
    logger.error('Storage health check failed:', error)
  }

  const overallStatus = Object.values(checks).every((s) => s === 'ok')
    ? 'healthy'
    : Object.values(checks).some((s) => s === 'error')
      ? 'unhealthy'
      : 'degraded'

  return {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  }
}
