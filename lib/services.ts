import { ServerMessage } from '../types/websocket.js'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import { SpotifyService } from '../types/interfaces.js'

export interface AppServices {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  isSpotifyInitialized: boolean
}

/**
 * Ensures that service instances are persisted across hot-reloads in development.
 * This prevents the "Double-Singleton" problem where multiple instances of stateful
 * services (like Spotify polling) are created during Next.js recompilation.
 *
 * In Next.js, standard singleton patterns (const service = new Service()) fail
 * because the module is re-executed on hot-reload, creating a new instance.
 * Patching globalThis is the standard Next.js way to persist instances.
 */
const globalWithServices = globalThis as unknown as {
  spotifyService: SpotifyService | undefined
  tabataService: TabataTimer | undefined
  isSpotifyInitialized: boolean | undefined
}

export async function createServices(
  broadcast: (data: Partial<ServerMessage>) => void
): Promise<AppServices> {
  // Reuse existing instances in development to avoid duplicate connections
  if (
    process.env.NODE_ENV !== 'production' &&
    globalWithServices.spotifyService &&
    globalWithServices.tabataService
  ) {
    return {
      spotifyService: globalWithServices.spotifyService,
      tabataService: globalWithServices.tabataService,
      isSpotifyInitialized: !!globalWithServices.isSpotifyInitialized,
    }
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

  // Expose instances globally (required for API routes and persistence)
  globalWithServices.spotifyService = services.spotifyService
  globalWithServices.tabataService = services.tabataService
  globalWithServices.isSpotifyInitialized = services.isSpotifyInitialized

  return services
}
