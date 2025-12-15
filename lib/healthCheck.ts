// lib/healthCheck.ts
import { WebSocket } from 'ws'
import TabataTimer from '../services/tabataTimer'
import { env } from './env'

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

export const checkSpotifyAPI = async () => {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      throw new Error(`Spotify API returned ${response.status}`)
    }

    return { healthy: true, message: 'Spotify API credentials are valid.' }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return {
      healthy: false,
      message: `Spotify API health check failed: ${errorMessage}`,
    }
  }
}

export async function checkWebSocketService(): Promise<{
  healthy: boolean
  details: Record<string, unknown>
}> {
  try {
    const wsUrl = 'ws://localhost:3000' // Corrected default URL
    // Check if WebSocket server is accepting connections
    const wsHealth = await new Promise((resolve) => {
      const testWs = new WebSocket(wsUrl)

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
        url: wsUrl,
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
