import { ServerMessage } from '../types/websocket.js'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import { WorkoutHistoryService } from '../services/workoutHistoryService.js'
import { SpotifyService } from '../types/interfaces.js'

export interface AppServices {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  workoutHistoryService: WorkoutHistoryService
  isSpotifyInitialized: boolean
}

export async function createServices(
  broadcast: (data: Partial<ServerMessage>) => void
): Promise<AppServices> {
  const tabataService = new TabataTimer(broadcast)
  const workoutHistoryService = new WorkoutHistoryService()
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

  return {
    tabataService,
    spotifyService,
    workoutHistoryService,
    isSpotifyInitialized,
  }
}
