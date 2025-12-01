// /app/api/health/ready/route.ts
import { spotifyServiceInstance, wssInstance } from '@/utils/socketManager'
import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

type CheckStatus = 'ok' | 'error' | 'pending'

export async function GET() {
  const checks: Record<string, CheckStatus> = {
    websocket: 'pending',
    spotify: 'pending',
    storage: 'pending',
  }

  // Check WebSocket Server
  // Considered "ok" if the instance exists. Clients may not always be connected.
  if (wssInstance) {
    checks.websocket = 'ok'
  } else {
    checks.websocket = 'error'
  }

  // Check Spotify Service
  if (spotifyServiceInstance) {
    // isReady() confirms the SDK is initialized.
    checks.spotify = spotifyServiceInstance.isReady() ? 'ok' : 'pending'
  } else {
    // This case would happen if the entire service failed to construct.
    checks.spotify = 'error'
  }

  // Check Storage (File System Write Access)
  const logsDir = path.join(process.cwd(), 'logs')
  const storageCheckPath = path.join(logsDir, 'healthcheck.tmp')
  try {
    await fs.mkdir(logsDir, { recursive: true })
    await fs.writeFile(storageCheckPath, new Date().toISOString())
    checks.storage = 'ok'
  } catch (error) {
    console.error('Storage health check failed:', error)
    checks.storage = 'error'
  } finally {
    // Ensure the temp file is cleaned up even if the check fails after creation
    try {
      await fs.unlink(storageCheckPath)
    } catch {
      // Ignore errors if the file doesn't exist
    }
  }

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  const isUnhealthy = Object.values(checks).some((s) => s === 'error')
  const isDegraded =
    !isUnhealthy && Object.values(checks).some((s) => s === 'pending')

  if (isUnhealthy) {
    status = 'unhealthy'
  } else if (isDegraded) {
    status = 'degraded'
  }

  return NextResponse.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  })
}
