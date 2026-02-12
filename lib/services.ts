import { SpotifyPollingService } from '@/services/spotifyPolling'
import { TabataTimer } from '@/services/tabataTimer'
import { Broadcaster } from '@/lib/websocket'

export interface AppServices {
  tabataService: TabataTimer
  spotifyService: SpotifyPollingService
  isSpotifyInitialized: boolean
}

// Ensures singleton persistence across Next.js compilation boundaries
const globalWithSpotify = global as typeof globalThis & {
  spotifyServiceInstance?: SpotifyPollingService
}

export const getSpotifyService = (): SpotifyPollingService => {
  const instance = globalWithSpotify.spotifyServiceInstance
  if (!instance) {
    // This should technically never happen if createServices is called at startup
    throw new Error('SpotifyService singleton not initialized')
  }
  return instance
}

export async function createServices(
  broadcast: Broadcaster
): Promise<AppServices> {
  const tabataService = new TabataTimer(broadcast)
  const spotifyService = new SpotifyPollingService(broadcast)
  let isSpotifyInitialized = false

  // Assign immediately to prevent race conditions during async initialization
  globalWithSpotify.spotifyServiceInstance = spotifyService

  try {
    await spotifyService.initializeSdk()
    spotifyService.startPolling()
    isSpotifyInitialized = true
  } catch (e) {
    console.warn('SpotifyPolling initialization paused (waiting for token):', e)
  }

  return { tabataService, spotifyService, isSpotifyInitialized }
}
