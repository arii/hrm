// File: services/serviceRegistry.ts
/**
 * Description: Centralized service factory and registry. This module is responsible for
 * instantiating, initializing, and managing the lifecycle of all background services.
 */

import { broadcast } from '../utils/broadcast'
import logger from '../utils/logger'
import { ServiceMap, ISpotifyService } from '../types/service'
import { SpotifyPolling } from './spotifyPolling'
import TabataTimer from './tabataTimer'
import { SpotifyData } from '@/types/websocket'

/**
 * Creates a fallback (stub) version of the Spotify service.
 * This is used when the real Spotify service fails to initialize,
 * preventing the entire server from crashing.
 * @returns {ISpotifyService} A stubbed Spotify service instance.
 */
function createSpotifyFallbackService(): ISpotifyService {
  logger.warn('Creating Spotify fallback service.')
  return {
    init: () => Promise.resolve(),
    stop: () => {},
    getState: (): SpotifyData => ({
      trackName: 'Spotify Not Configured',
      artist: 'Service unavailable',
      isPlaying: false,
      devices: [],
    }),
    handleCommand: () => {
      logger.warn('Spotify command ignored: Service is in fallback mode.')
    },
    isReady: () => false,
    forcePollAndBroadcast: () => {},
    setRefreshToken: () => {},
  } as unknown as ISpotifyService
}

/**
 * Initializes all registered services.
 * This function instantiates each service, calls its `init()` method,
 * and handles any initialization errors gracefully (e.g., by creating a fallback service).
 *
 * @returns {Promise<ServiceMap>} A promise that resolves with a map of the initialized services.
 */
export async function initServices(): Promise<ServiceMap> {
  // --- Spotify Service Initialization ---
  let spotifyService: ISpotifyService
  try {
    const realSpotifyService = new SpotifyPolling(broadcast)
    await realSpotifyService.init()
    spotifyService = realSpotifyService
    logger.info('SpotifyPolling service initialized successfully.')
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed. Using fallback.')
    broadcast({
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: false,
    })
    spotifyService = createSpotifyFallbackService()
  }

  // --- Tabata Timer Service Initialization ---
  const tabataService = new TabataTimer(broadcast)
  await tabataService.init() // Though synchronous, we await for consistency
  logger.info('TabataTimer service initialized successfully.')

  // --- Service Map ---
  // The registry of all active services.
  const services: ServiceMap = {
    spotifyService,
    tabataService,
  }

  return services
}
