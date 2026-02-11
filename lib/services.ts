import { SpotifyPollingService } from '@/services/spotifyPolling'
import { TabataService } from '@/services/tabataTimer'
import { Broadcaster } from '@/lib/websocket'
import { SpotifyService } from '@/types/interfaces'

export interface AppServices {
  tabataService: TabataService
  spotifyService: SpotifyService
  isSpotifyInitialized: boolean
}

// 1. Create a mutable singleton reference
let spotifyServiceInstance: SpotifyService | null = null

// 2. Add an accessor for API routes
export const getSpotifyService = (): SpotifyService => {
  if (!spotifyServiceInstance) {
    throw new Error(
      'SpotifyService not initialized. Server may be starting up.'
    )
  }
  return spotifyServiceInstance
}

export async function createServices(
  broadcast: Broadcaster
): Promise<AppServices> {
  const tabataService = new TabataService(broadcast)
  let spotifyService: SpotifyService
  let isSpotifyInitialized = true

  try {
    spotifyService = await SpotifyPollingService.create(broadcast)
  } catch (e) {
    console.error('SpotifyPolling initialization failed:', e)
    isSpotifyInitialized = false
    // Fallback stub
    spotifyService = {
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
      forcePollAndBroadcast: () => {},
      handleTokenUpdate: () => Promise.resolve(),
      cleanup: () => {},
    }
  }

  // 3. Assign the instance during startup
  spotifyServiceInstance = spotifyService

  return { tabataService, spotifyService, isSpotifyInitialized }
}
