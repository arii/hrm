import { ServerMessage } from '../types/websocket.js'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import { SpotifyService } from '../types/interfaces.js'

export interface AppServices {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  isSpotifyInitialized: boolean
}

export async function createServices(
  broadcast: (data: Partial<ServerMessage>) => void
): Promise<AppServices> {
  // Reuse existing instances in development (Next.js Singleton Pattern)
  if (
    process.env.NODE_ENV !== 'production' &&
    global.spotifyService &&
    global.tabataService
  ) {
    return {
      spotifyService: global.spotifyService,
      tabataService: global.tabataService,
      isSpotifyInitialized: !!global.isSpotifyInitialized,
    }
  }

  // Cleanup partial state if necessary
  if (process.env.NODE_ENV !== 'production') {
    global.spotifyService?.cleanup()
    global.tabataService?.cleanup()
  }

  const tabataService = new TabataTimer(broadcast)
  let spotifyService: SpotifyService
  let isSpotifyInitialized = true

  try {
    spotifyService = await SpotifyPolling.create(broadcast)
  } catch (e) {
    console.error('SpotifyPolling initialization failed:', e)
    isSpotifyInitialized = false
    // Fallback stub
    spotifyService = {
      handleCommand: () => {},
      stopPolling: () => {},
      startPolling: () => {},
      getState: () => ({
        devices: [],
        playback: {
          track: {
            id: '',
            name: 'Service Error',
            artist: '',
            albumName: '',
            albumArtUrl: '',
          },
          is_playing: false,
          isMuted: false,
          volume_percent: 0,
          progress_ms: 0,
        },
      }),
      isReady: () => false,
      forcePollAndBroadcast: () => {},
      handleTokenUpdate: () => Promise.resolve(),
      cleanup: () => {},
    }
  }

  const services = { tabataService, spotifyService, isSpotifyInitialized }

  global.spotifyService = services.spotifyService
  global.tabataService = services.tabataService
  global.isSpotifyInitialized = services.isSpotifyInitialized

  return services
}
