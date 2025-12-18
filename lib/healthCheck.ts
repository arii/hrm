// lib/healthCheck.ts
import { WebSocket } from 'ws'
import TabataTimer from '../services/tabataTimer'
import { cancellablePromise } from '../utils/promise'

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

/**
 * Checks if the WebSocket server is alive by attempting a connection.
 * Uses a cancellable promise to enforce a timeout.
 */
export async function checkWebSocketService(): Promise<{
  healthy: boolean
  details: Record<string, unknown>
}> {
  // Default to 127.0.0.1 for consistency with other parts of the app
  const wsUrl = process.env.WS_URL || 'ws://127.0.0.1:3000'

  try {
    const connectionPromise = new Promise<boolean>((resolve, reject) => {
      const testWs = new WebSocket(wsUrl)
      testWs.on('open', () => {
        testWs.close()
        resolve(true)
      })
      testWs.on('error', (err) => {
        // The error event is fired for connection errors. Rejecting here allows
        // the cancellablePromise to fail fast instead of waiting for the timeout.
        testWs.terminate() // Use terminate for forceful close on error
        reject(err)
      })
    })

    await cancellablePromise(connectionPromise, {
      timeoutMs: 5000,
      errorMessage: `WebSocket connection to ${wsUrl} timed out after 5s`,
    })

    return {
      healthy: true,
      details: {
        service: 'websocket',
        url: wsUrl,
        status: 'connected',
      },
    }
  } catch (error) {
    return {
      healthy: false,
      details: {
        service: 'websocket',
        url: wsUrl,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown connection error',
      },
    }
  }
}

export async function checkSpotifyAPI(): Promise<{
  healthy: boolean
  details: Record<string, unknown>
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

export function checkTimerService(tabataTimer: TabataTimer): {
  healthy: boolean
  details: Record<string, unknown>
} {
  try {
    const timerCheck =
      typeof tabataTimer !== 'undefined' && tabataTimer.getState

    return {
      healthy: true,
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
