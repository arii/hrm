// app/api/health/detailed/route.ts
import { NextResponse } from 'next/server'
import { checkMemoryUsage } from '../../../../lib/healthCheck'
import { env } from '@/lib/env'

async function checkStatefulServices(): Promise<{
  healthy: boolean
  details: Record<string, unknown>
}> {
  const baseUrl = env.NEXTAUTH_URL
  if (!baseUrl) {
    return {
      healthy: false,
      details: {
        service: 'internal-services',
        error: 'NEXTAUTH_URL environment variable is not defined.',
      },
    }
  }
  try {
    const internalUrl = `${baseUrl}/api/internal/health/services`
    const response = await fetch(internalUrl, { cache: 'no-store' }) // Ensure fresh data
    if (!response.ok) {
      return {
        healthy: false,
        details: {
          service: 'internal-services',
          error: `Failed to fetch: ${response.status} ${response.statusText}`,
        },
      }
    }
    return await response.json()
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'internal-services',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

export async function GET() {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    uptime: process.uptime(),
    version: env.npm_package_version || 'unknown',
    checks: {
      memory: checkMemoryUsage(),
      services: await checkStatefulServices(),
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

  return NextResponse.json(healthChecks, { status: statusCode })
}
