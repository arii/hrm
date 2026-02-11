import { SpotifyPollingService } from '@/services/spotifyPolling'
import { TabataTimer } from '@/services/tabataTimer'
import { Broadcaster } from '@/lib/websocket'
import { SpotifyService } from '@/types/interfaces'
import { ServiceInitializationError } from '@/lib/errors'

export interface AppServices {
  tabataService: TabataTimer
  spotifyService: SpotifyService
  isSpotifyInitialized: boolean
}

const createNoOpSpotifyService = (): SpotifyService => ({
  handleCommand: () => {},
  stopPolling: () => {},
  startPolling: () => {},
  getState: () => ({
    trackName: 'Service Error',
    artist: '',
    isPlaying: false,
    trackId: '',
    albumName: '',
    albumArtUrl: '',
    devices: [],
    volume: 0,
    isMuted: false,
  }),
  isReady: () => false,
  forcePollAndBroadcast: () => Promise.resolve(),
  handleTokenUpdate: () => Promise.resolve(),
  cleanup: () => {},
})

// Ensures singleton persistence across Next.js compilation boundaries
const globalWithSpotify = global as typeof globalThis & {
  spotifyServiceInstance?: SpotifyService
}

export const getSpotifyService = (): SpotifyService => {
  const instance = globalWithSpotify.spotifyServiceInstance
  if (!instance) {
    throw new ServiceInitializationError('SpotifyService')
  }
  return instance
}

export async function createServices(
  broadcast: Broadcaster
): Promise<AppServices> {
  const tabataService = new TabataTimer(broadcast)
  let spotifyService: SpotifyService
  let isSpotifyInitialized = true

  try {
    spotifyService = await SpotifyPollingService.create(broadcast)
  } catch (e) {
    console.error('SpotifyPolling initialization failed:', e)
    isSpotifyInitialized = false
    spotifyService = createNoOpSpotifyService()
  }

  globalWithSpotify.spotifyServiceInstance = spotifyService

  return { tabataService, spotifyService, isSpotifyInitialized }
}
