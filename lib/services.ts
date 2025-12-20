// lib/services.ts
import { SpotifyPolling } from '@/services/spotifyPolling'
import TabataTimer from '@/services/tabataTimer'

/**
 * Singleton instances of the core services.
 * These are initialized in `server.ts` and made available here for use in other
 * parts of the application, such as API routes.
 */
interface Services {
  spotifyService: SpotifyPolling | null
  tabataService: TabataTimer | null
}

export const services: Services = {
  spotifyService: null,
  tabataService: null,
}

export const setSpotifyService = (service: SpotifyPolling) => {
  services.spotifyService = service
}

export const setTabataService = (service: TabataTimer) => {
  services.tabataService = service
}
