// File: lib/healthCheck.ts (Service Health Check Utilities)
/**
 * Utility functions for checking the health of various application services.
 */

import TabataTimer from '../services/tabataTimer'
import { env } from './env'

// --- Type Definitions ---
export interface HealthCheckResult {
  healthy: boolean
  message: string
  details?: Record<string, unknown>
}

// --- Service-Specific Checks ---

/**
 * Checks the current memory usage of the Node.js process.
 * @returns A HealthCheckResult object with memory usage details.
 */
export const checkMemoryUsage = (): HealthCheckResult => {
  const used = process.memoryUsage()
  const usedMB = Math.round((used.heapUsed / 1024 / 1024) * 100) / 100
  const healthy = usedMB < 500 // Example threshold: 500MB
  return {
    healthy,
    message: `Memory usage: ${usedMB} MB`,
    details: {
      usedMB,
      heapTotalMB: Math.round((used.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((used.rss / 1024 / 1024) * 100) / 100,
    },
  }
}

/**
 * Checks the health of the TabataTimer service.
 * @param timerService The instance of the TabataTimer service.
 * @returns A HealthCheckResult object.
 */
export const checkTimerService = (
  timerService: TabataTimer
): HealthCheckResult => {
  if (timerService && typeof timerService.getState === 'function') {
    return {
      healthy: true,
      message: 'Timer service is running.',
      details: { instance: 'active' },
    }
  }
  return {
    healthy: false,
    message: 'Timer service is not initialized.',
    details: { instance: 'inactive' },
  }
}

/**
 * Checks the health of the WebSocket service by attempting to connect to it.
 * @returns A promise that resolves to a HealthCheckResult object.
 */
export const checkWebSocketService = async (): Promise<HealthCheckResult> => {
  try {
    const wsUrl = env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000' // Corrected default URL
    const ws = new (await import('ws')).default(wsUrl)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          healthy: false,
          message: 'WebSocket connection timed out.',
        })
        ws.close()
      }, 5000) // 5-second timeout

      ws.on('open', () => {
        clearTimeout(timeout)
        ws.close()
        resolve({ healthy: true, message: 'WebSocket connection successful.' })
      })
      ws.on('error', (error) => {
        clearTimeout(timeout)
        resolve({
          healthy: false,
          message: `WebSocket connection failed: ${error.message}`,
        })
      })
    })
  } catch (error) {
    return {
      healthy: false,
      message: `WebSocket connection failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}

/**
 * Checks the health of the Spotify API by making a test request.
 * @returns A promise that resolves to a HealthCheckResult object.
 */
export const checkSpotifyAPI = async (): Promise<HealthCheckResult> => {
  try {
    // This is a placeholder for a real Spotify API check
    const response = await fetch('https://api.spotify.com/v1/search?q=test&type=track', {
      headers: {
        Authorization: `Bearer ${env.SPOTIFY_CLIENT_ID}`, // Just an example, this will fail
      },
    });
    if (response.status === 401) {
      return { healthy: true, message: 'Spotify API is reachable (auth failed as expected).' };
    }
    return { healthy: true, message: 'Spotify API is reachable.' };
  } catch (error) {
    return {
      healthy: false,
      message: `Spotify API is unreachable: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}
