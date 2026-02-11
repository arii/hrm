import { SpotifyPollingService } from '@/services/spotifyPolling'
import { TabataService } from '@/services/tabataTimer'
import { Broadcaster } from '@/lib/websocket'
import { SpotifyService } from '@/types/interfaces'
import { ServiceInitializationError } from '@/lib/errors'

export interface AppServices {
  tabataService: TabataService
  spotifyService: SpotifyService
  isSpotifyInitialized: boolean
}

let spotifyServiceInstance: SpotifyService | null = null

export const getSpotifyService = (): SpotifyService => {
  if (!spotifyServiceInstance) {
    throw new ServiceInitializationError('SpotifyService')
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

  spotifyServiceInstance = spotifyService

  return { tabataService, spotifyService, isSpotifyInitialized }
}
