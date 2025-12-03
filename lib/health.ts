import { SpotifyPolling } from '../services/spotifyPolling'
import fs from 'fs/promises'
import path from 'path'
import { WebSocketServer } from 'ws'
import TabataTimer from '../services/tabataTimer'

// Define the shape of the health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    [key: string]: 'ok' | 'error' | 'timeout'
  }
  timestamp: string
}

// Define the status of each check
export type CheckStatus = 'ok' | 'error' | 'timeout'

// --- Individual Check Functions ---

/**
 * Checks if the WebSocket server is initialized.
 * @param wss The WebSocketServer instance.
 * @returns 'ok' if the server object exists, 'error' otherwise.
 */
const checkWebSocket = (wss: WebSocketServer): CheckStatus => {
  return wss ? 'ok' : 'error'
}

/**
 * Checks if the Spotify service is initialized and ready.
 * @param spotifyService The SpotifyPolling service instance.
 * @returns 'ok' if the service's SDK is ready, 'error' otherwise.
 */
const checkSpotify = (spotifyService: SpotifyPolling): CheckStatus => {
  // The isReady() method should reflect if the SDK is initialized
  return spotifyService.isReady() ? 'ok' : 'error'
}

/**
 * Checks if the application has write access to the logs directory.
 * This is a proxy for checking if file-based token persistence will work.
 * @returns 'ok' if a temporary file can be created and deleted, 'error' otherwise.
 */
const checkStorage = async (): Promise<CheckStatus> => {
  try {
    const testFilePath = path.join(process.cwd(), 'logs', 'healthcheck.tmp')
    await fs.writeFile(testFilePath, 'test')
    await fs.unlink(testFilePath)
    return 'ok'
  } catch (error) {
    console.error('Storage health check failed:', error)
    return 'error'
  }
}

/**
 * Checks the status of the TabataTimer service.
 * A simple check to ensure the service object exists.
 * @param tabataService The TabataTimer instance.
 * @returns 'ok' if the service is not null/undefined.
 */
const checkTabataTimer = (tabataService: TabataTimer): CheckStatus => {
  return tabataService ? 'ok' : 'error'
}

// --- Aggregator Function ---

/**
 * Runs all health checks and aggregates the results.
 * @param services An object containing the application's main services.
 * @returns A promise that resolves to the full health check response object.
 */
export const getHealthChecks = async (services: {
  wss: WebSocketServer
  spotifyService: SpotifyPolling
  tabataService: TabataTimer
}): Promise<HealthCheckResponse> => {
  const { wss, spotifyService, tabataService } = services

  // Run checks in parallel
  const results = await Promise.all([
    checkWebSocket(wss),
    checkSpotify(spotifyService),
    checkStorage(),
    checkTabataTimer(tabataService),
  ])

  const checks = {
    websocket: results[0],
    spotify: results[1],
    storage: results[2],
    tabataTimer: results[3],
  }

  // Determine overall status
  const allOk = Object.values(checks).every((status) => status === 'ok')
  const status = allOk ? 'healthy' : 'unhealthy'

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
  }
}
