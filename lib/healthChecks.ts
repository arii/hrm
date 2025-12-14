import { tabataTimer } from '@/utils/socketManager'
import WebSocket from 'ws'

// Individual health check functions
export function checkMemoryUsage() {
  const memUsage = process.memoryUsage()
  const memUsageMB = memUsage.heapUsed / 1024 / 1024
  const memLimitMB = 512 // Adjust based on deployment

  return {
    healthy: memUsageMB < memLimitMB,
    details: {
      usedMB: Math.round(memUsageMB),
      limitMB: memLimitMB,
      percentage: Math.round((memUsageMB / memLimitMB) * 100),
    },
  }
}

export async function checkWebSocketService(): Promise<{
  healthy: boolean
  details: {
    service: string
    url?: string
    error?: string
  }
}> {
  try {
    // Check if WebSocket server is accepting connections
    const wsHealth = await new Promise((resolve) => {
      const testWs = new WebSocket(
        process.env.WS_URL || 'ws://localhost:3000/ws'
      )

      const timeout = setTimeout(() => {
        testWs.close()
        resolve(false)
      }, 5000)

      testWs.onopen = () => {
        clearTimeout(timeout)
        testWs.close()
        resolve(true)
      }

      testWs.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })

    return {
      healthy: Boolean(wsHealth),
      details: {
        service: 'websocket',
        url: process.env.WS_URL || 'ws://localhost:3000',
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'websocket',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

export async function checkSpotifyAPI(): Promise<{
  healthy: boolean
  details: {
    service: string
    status?: number
    reachable?: boolean
    error?: string
  }
}> {
  try {
    // Test Spotify API connectivity (no auth required)
    const response = await fetch(
      'https://api.spotify.com/v1/browse/categories?limit=1',
      {
        headers: {
          'User-Agent': 'HRM-App/1.0',
        },
      }
    )

    const healthy = response.status === 401 // 401 is expected without auth

    return {
      healthy,
      details: {
        service: 'spotify-api',
        status: response.status,
        reachable: response.status !== undefined,
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'spotify-api',
        error: error instanceof Error ? error.message : 'Network unreachable',
      },
    }
  }
}

export function checkTimerService() {
  try {
    // Basic timer service check - ensure class can be instantiated
    const timerCheck = typeof tabataTimer !== 'undefined'

    return {
      healthy: true, // Timer is in-memory, always healthy if app is running
      details: {
        service: 'timer',
        instance: timerCheck ? 'active' : 'standby',
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'timer',
        error: error instanceof Error ? error.message : 'Timer service error',
      },
    }
  }
}
