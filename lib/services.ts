// lib/services.ts
import { SpotifyPolling } from '@/services/spotifyPolling'
import { broadcast } from '@/utils/broadcast'
import logger from '@/utils/logger'

let spotifyService: SpotifyPolling

const initializeSpotifyService = async () => {
  try {
    spotifyService = await SpotifyPolling.create(broadcast)
  } catch (e) {
    logger.error({ err: e }, 'SpotifyPolling initialization failed')
    broadcast({
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: false,
    })
    // Fallback stub to avoid crashing entire server if Spotify setup fails
    spotifyService = {
      handleCommand: () => {},
      stopPolling: () => {},
      startPolling: () => {},
      setRefreshToken: () => {},
    } as unknown as SpotifyPolling
  }
}

initializeSpotifyService()

export { spotifyService }
