// File: services/serviceRegistry.ts
/**
 * Service Registry/Factory: Centralizes the instantiation and management of all
 * persistent backend services. This decouples the main server from the specific
 * service implementations.
 */

import { SpotifyPolling } from './spotifyPolling.js'
import TabataTimer from './tabataTimer.js'
import { broadcast } from '../utils/broadcast.js'
import logger from '../utils/logger.js'
import { ServerMessage } from '../types/websocket.js'

// Define a map type for our services for cleaner type hinting
export interface ServiceMap {
  spotifyService: SpotifyPolling
  tabataService: TabataTimer
}

/**
 * Initializes all application services.
 * It handles dependency injection (e.g., broadcasting) and gracefully
 * manages initialization failures (e.g., for Spotify).
 * @returns A promise that resolves to a map of the initialized services.
 */
export async function initServices(): Promise<ServiceMap> {
  // --- Spotify Service Initialization ---
  let spotifyService: SpotifyPolling
  try {
    spotifyService = await SpotifyPolling.create(
      broadcast as (message: ServerMessage) => void
    )
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed')
    broadcast({
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: false,
    })
    // Fallback stub to prevent server crash if Spotify setup fails
    spotifyService = {
      handleCommand: () => {},
      stopPolling: () => {},
      startPolling: () => {},
      setRefreshToken: () => {},
      isReady: () => false,
      getState: () => ({
        trackName: 'Service Failed',
        artist: 'Spotify could not be initialized.',
        isPlaying: false,
      }),
      forcePollAndBroadcast: async () => {},
      getAvailableDevices: async () => [],
    } as unknown as SpotifyPolling
  }

  // --- Tabata Timer Service Initialization ---
  const tabataService = new TabataTimer(
    broadcast as (message: ServerMessage) => void
  )

  logger.info('All services initialized.')

  return {
    spotifyService,
    tabataService,
  }
}
