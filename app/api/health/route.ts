// app/api/health/route.ts
import {
  checkMemoryUsage,
  checkSpotifyAPI,
  checkTimerService,
  checkWebSocketService,
} from '@/lib/healthChecks'

export async function GET() {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    checks: {
      memory: checkMemoryUsage(),
      websocket: await checkWebSocketService(),
      spotify: await checkSpotifyAPI(),
      timer: checkTimerService(),
    },
  }

  // Determine overall status
  const failedChecks = Object.values(healthChecks.checks).filter(
    (check) => !check.healthy
  )

  if (failedChecks.length === 0) {
    healthChecks.status = 'healthy'
  } else if (failedChecks.length <= 1) {
    healthChecks.status = 'degraded'
  } else {
    healthChecks.status = 'unhealthy'
  }

  const statusCode = healthChecks.status === 'healthy' ? 200 : 503

  return Response.json(healthChecks, { status: statusCode })
}
