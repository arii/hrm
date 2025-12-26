import { ServerMessage, SpotifyData } from '../types/websocket.js'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import { SpotifyService } from '../types/interfaces.js'
import logger from '../utils/logger.js'
import { SpotifyTokenPayload } from '@/services/spotifyTokenManager.js'
import { SpotifyDevice } from '@/types/core'

export interface AppServices {
  spotifyService: SpotifyService
  tabataService: TabataTimer
}

// This is the fallback stub that will be used if the real Spotify service fails to initialize.
// It implements the SpotifyService interface to ensure type safety.
const createSpotifyFallback = (): SpotifyService => ({
  handleCommand: () => {
    logger.warn('Spotify command ignored: service is not initialized.')
  },
  getState: (): SpotifyData => ({
    trackName: 'Service Error',
    artist: '',
    isPlaying: false,
    trackId: null,
    albumArtUrl: '',
    albumName: '',
    devices: [],
    isMuted: false,
    volume: 0,
  }),
  isReady: () => false,
  handleTokenUpdate: (_tokens: SpotifyTokenPayload) => {
    logger.warn('Spotify token update ignored: service is not initialized.')
    return Promise.resolve()
  },
  getAvailableDevices: async (): Promise<SpotifyDevice[]> => {
    logger.warn('getAvailableDevices is not implemented in fallback service')
    return []
  },
  // Optional methods from Lifecycle interface
  startPolling: () => {},
  stopPolling: () => {},
  cleanup: () => {},
})

export async function createServices(
  broadcast: (data: ServerMessage) => void
): Promise<AppServices> {
  const tabataService = new TabataTimer(broadcast)
  let spotifyService: SpotifyService

  try {
    // Await the static create method to properly initialize the service
    spotifyService = await SpotifyPolling.create(broadcast)
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed. Using fallback.')
    // Use the type-safe fallback stub
    spotifyService = createSpotifyFallback()
  }

  return { tabataService, spotifyService }
}
