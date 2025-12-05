import { ITabataTimer, ISpotifyPolling } from '@/types/service';
import TabataTimer from '@/services/tabataTimer';
import { SpotifyPolling } from '@/services/spotifyPolling';
import { broadcast } from '@/utils/broadcast';
import logger from '@/utils/logger';

class ServiceRegistry {
  private static instance: ServiceRegistry;
  public tabataTimer!: ITabataTimer;
  public spotifyPolling!: ISpotifyPolling;

  private constructor() {}

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  public async initializeServices(): Promise<void> {
    this.tabataTimer = new TabataTimer(broadcast);

    try {
      this.spotifyPolling = await SpotifyPolling.create(broadcast);
    } catch (e) {
      logger.error({ err: e }, 'SpotifyPolling initialization failed in service registry');
      broadcast({
        type: 'SPOTIFY_SERVICE_INIT_UPDATE',
        payload: false,
      });
      // Provide a non-functional fallback
      this.spotifyPolling = {
        getState: () => ({
          trackName: 'Spotify Not Available',
          artist: '',
          isPlaying: false,
          devices: [],
        }),
        isReady: () => false,
        handleCommand: () => Promise.resolve(),
        startPolling: () => {},
        stopPolling: () => {},
        setRefreshToken: () => {},
        forcePollAndBroadcast: () => Promise.resolve(),
      };
    }
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
