import { ServerMessage } from '../types/websocket.js'
import { SpotifyPolling } from '../services/spotifyPolling.js'
import TabataTimer from '../services/tabataTimer.js'
import { SpotifyService } from '../types/interfaces.js'
import {
  startCalorieService,
  stopCalorieService,
} from '../services/calorieService.js'
import { HrmDataRepository } from './repositories/HrmDataRepository.js'

export interface AppServices {
  spotifyService: SpotifyService
  tabataService: TabataTimer
  calorieService: {
    stop: () => void
  }
  isSpotifyInitialized: boolean
}

export async function createServices(
  broadcast: (data: Partial<ServerMessage>) => void,
  hrmDataRepository: HrmDataRepository
): Promise<AppServices> {
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

  startCalorieService(hrmDataRepository)
  const calorieService = {
    stop: stopCalorieService,
  }

  return { tabataService, spotifyService, calorieService, isSpotifyInitialized }
}
