// /app/api/health/ready/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import {
  spotifyServiceInstance,
  tabataServiceInstance,
  wssInstance,
} from '../../../utils/socketManager'

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness Probe
 *     description: >
 *       Performs a readiness check to confirm that the server and all its dependent services
 *       (WebSocket, Spotify Polling, Storage) are operational.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: All services are healthy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 *       503:
 *         description: One or more services are degraded or unhealthy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 */

type CheckStatus = 'ok' | 'error' | 'unavailable'

interface ReadinessResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    nextApp: CheckStatus
    websocket: CheckStatus
    spotifyPolling: CheckStatus
    tabataTimer: CheckStatus
    storage: CheckStatus
  }
  timestamp: string
}

async function checkStorage(): Promise<CheckStatus> {
  try {
    const storagePath = path.join(process.cwd(), 'logs')
    await fs.access(storagePath, fs.constants.W_OK)
    return 'ok'
  } catch (error) {
    console.error('Storage check failed:', error)
    return 'error'
  }
}

export async function GET() {
  const checks = {
    nextApp: 'ok' as CheckStatus, // If this code runs, Next.js is serving requests
    websocket: wssInstance ? 'ok' : 'error',
    spotifyPolling: spotifyServiceInstance?.isReady() ? 'ok' : 'unavailable',
    tabataTimer: tabataServiceInstance ? 'ok' : 'error',
    storage: await checkStorage(),
  }

  const checkStates = Object.values(checks)
  let overallStatus: ReadinessResponse['status'] = 'healthy'

  if (checkStates.some((s) => s === 'error')) {
    overallStatus = 'unhealthy'
  } else if (checkStates.some((s) => s === 'unavailable')) {
    overallStatus = 'degraded'
  }

  const response: ReadinessResponse = {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status: overallStatus === 'healthy' ? 200 : 503,
  })
}
