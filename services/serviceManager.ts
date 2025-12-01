// File: services/serviceManager.ts
/**
 * Service Manager: Handles the instantiation and lifecycle of all application services.
 * This module centralizes service creation, dependency injection (e.g., broadcaster),
 * and initialization error handling.
 */
import { SpotifyPolling } from './spotifyPolling.js'
import TabataTimer from './tabataTimer.js'
import logger from '../utils/logger.js'
import { ServerMessage } from '../types/websocket.js'

/**
 * A map of all active services, providing a single point of access.
 */
export interface ServiceMap {
  spotifyService: SpotifyPolling
  tabataService: TabataTimer
}

// Store service instances for access by other modules (e.g., API routes)
let services: ServiceMap | null = null

/**
 * Initializes all application services.
 * @param broadcaster - The function used to broadcast messages to all WebSocket clients.
 * @returns A promise that resolves to the map of initialized services.
 */
export async function initServices(
  broadcaster: (message: ServerMessage) => void
): Promise<ServiceMap> {
  // 1. Initialize Spotify Polling Service (with error handling)
  let spotifyService: SpotifyPolling
  try {
    spotifyService = await SpotifyPolling.create(broadcaster)
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed')
    broadcaster({
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: false,
    })
    // Fallback stub to prevent server crash
    spotifyService = {
      handleCommand: () => {},
      cleanup: () => {},
      startPolling: () => {},
      setRefreshToken: () => {},
      getState: () => ({
        trackName: 'Service Unavailable',
        artist: '',
        isPlaying: false,
      }),
    } as unknown as SpotifyPolling
  }

  // 2. Initialize Tabata Timer Service
  const tabataService = new TabataTimer(broadcaster)

  services = {
    spotifyService,
    tabataService,
  }

  return services
}

/**
 * Retrieves the initialized service instances.
 * Throws an error if services have not been initialized yet.
 * @returns The map of service instances.
 */
export function getServices(): ServiceMap {
  if (!services) {
    throw new Error(
      'getServices() called before initServices() has completed.'
    )
  }
  return services
}
