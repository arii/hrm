// File: services/registry.ts
/**
 * @file Service Registry - Centralized Service Instantiation and Management.
 * This module is responsible for creating, initializing, and providing access
 * to all singleton services (e.g., SpotifyPolling, TabataTimer).
 * It exports a singleton `serviceContainer` for use in other parts of the application,
 * such as API routes.
 */

import { ISpotifyService, ITimerService } from '../types/service'
import { ServerMessage } from '../types/websocket'
import logger from '../utils/logger'
import { SpotifyPolling } from './spotifyPolling'
import TabataTimer from './tabataTimer'

/**
 * A container for all the application's services.
 */
export interface ServiceContainer {
  spotifyService: ISpotifyService
  timerService: ITimerService
}

/**
 * A singleton container for the application's services.
 * This is initialized once and can be imported by other modules.
 */
export let serviceContainer: ServiceContainer

/**
 * Instantiates and initializes all application services.
 * This function encapsulates the logic of service creation and dependency injection.
 * @param {Function} broadcast - The WebSocket broadcast function.
 * @returns {Promise<ServiceContainer>} A promise that resolves to a container with all initialized services.
 */
export async function initServices(
  broadcast: (message: ServerMessage) => void
): Promise<ServiceContainer> {
  logger.info('Initializing services...')

  // --- Spotify Service ---
  let spotifyService: ISpotifyService
  try {
    spotifyService = await SpotifyPolling.create(broadcast)
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed in registry')
    // Provide a fallback "null" service to prevent crashing the server.
    // This allows the rest of the app to function even if Spotify auth fails.
    spotifyService = {
      start: () => {},
      stop: () => {},
      getState: () => ({
        trackName: 'Spotify Not Available',
        artist: '',
        isPlaying: false,
      }),
      handleCommand: () => {},
      isReady: () => false,
      getAvailableDevices: () => Promise.resolve([]),
      setRefreshToken: () => {},
      forcePollAndBroadcast: () => {},
    }
  }

  // --- Tabata Timer Service ---
  const timerService = new TabataTimer(broadcast)

  // Start all services
  await spotifyService.start()
  await timerService.start()

  logger.info('All services initialized.')

  serviceContainer = {
    spotifyService,
    timerService,
  }

  return serviceContainer
}
