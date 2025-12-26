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
  const tabataService = new TabataTimer(broadcast)
  const spotifyService = await SpotifyPolling.create(broadcast)
  const isSpotifyInitialized = spotifyService.isReady()

  return { tabataService, spotifyService, isSpotifyInitialized }
}
