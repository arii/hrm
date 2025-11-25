// File: app/api/health/route.ts
/**
 * Route: /api/health
 * Description: Health check endpoints for monitoring service status.
 *
 * Endpoints:
 * - GET /api/health/live: Liveness probe to confirm the server is running.
 * - GET /api/health/ready: Readiness probe to check the status of critical services.
 */
import {
  spotifyServiceInstance,
  tabataServiceInstance,
  wssInstance,
} from '@/utils/socketManager'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const { pathname } = new URL(req.url)

  if (pathname === '/api/health/live') {
    // Liveness probe: If the server is up, this will respond.
    return NextResponse.json({ status: 'live' }, { status: 200 })
  }

  if (pathname === '/api/health/ready') {
    // Readiness probe: Check critical services.
    const spotifyReady = spotifyServiceInstance?.isReady() ?? false
    const timerReady = !!tabataServiceInstance
    const websocketReady = !!wssInstance

    const isHealthy = spotifyReady && timerReady && websocketReady

    const health = {
      status: isHealthy ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      services: {
        spotify: {
          ready: spotifyReady,
          message: spotifyReady
            ? 'Service Initialized'
            : 'Service Not Initialized',
        },
        tabataTimer: {
          ready: timerReady,
          message: timerReady
            ? 'Service Initialized'
            : 'Service Not Initialized',
        },
        websocket: {
          ready: websocketReady,
          message: websocketReady
            ? 'Server Initialized'
            : 'Server Not Initialized',
          connections: wssInstance?.clients?.size ?? 0,
        },
      },
      uptime: process.uptime(),
    }

    return NextResponse.json(health, { status: isHealthy ? 200 : 503 })
  }

  // Default response for /api/health
  return NextResponse.json(
    {
      message: 'Health check endpoint. Use /api/health/live or /api/health/ready.',
    },
    { status: 404 }
  )
}
