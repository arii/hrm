// File: utils/services.ts
/**
 * Centralized service initialization and export.
 * This module creates singleton instances of all major services and exports them
 * for use throughout the application, ensuring a single source of truth.
 */

import { SpotifyPolling } from '@/services/spotifyPolling'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import TabataTimer from '@/services/tabataTimer'
import { broadcast } from './broadcast'
import logger from './logger'

// 1. Initialize the Spotify Token Manager
// This must be available to both the API layer (for token delivery) and the polling service.
export const spotifyTokenManager = new SpotifyTokenManager(
  process.env.SPOTIFY_CLIENT_ID || '',
  process.env.SPOTIFY_CLIENT_SECRET || ''
)

// 2. Initialize the main services, injecting dependencies as needed.
export const initializeCoreServices = async () => {
  let spotifyService: SpotifyPolling
  try {
    // Race the Spotify service initialization against a timeout.
    // This prevents the server from hanging during startup in test environments
    // where network access to the Spotify API may be blocked or slow.
    const spotifyPromise = SpotifyPolling.create(broadcast, spotifyTokenManager)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('SpotifyPolling initialization timed out')),
        10000
      )
    )
    spotifyService = await Promise.race([spotifyPromise, timeoutPromise])
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed')
    broadcast({
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: false,
    })
    // Fallback stub to prevent server crash
    spotifyService = {
      handleCommand: () => {},
      stopPolling: () => {},
      startPolling: () => {},
      setRefreshToken: async () => {},
      forcePollAndBroadcast: async () => {},
      isReady: () => false,
      getState: () => ({
        trackName: 'Service Unavailable',
        artist: '',
        isPlaying: false,
        devices: [],
      }),
    } as unknown as SpotifyPolling
  }

  const tabataService = new TabataTimer(broadcast)

  return { spotifyService, tabataService }
}
