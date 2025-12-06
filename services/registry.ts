// services/registry.ts

import { SpotifyService, TimerService } from '../types/service.js';
import { SpotifyPolling } from './spotifyPolling.js';
import TabataTimer from './tabataTimer.js';
import { broadcast } from '../utils/broadcast.js';

/**
 * A registry for all the services.
 */
export class ServiceRegistry {
  public readonly spotifyService: SpotifyService;
  public readonly tabataTimer: TimerService;

  private constructor(spotifyService: SpotifyService, tabataTimer: TimerService) {
    this.spotifyService = spotifyService;
    this.tabataTimer = tabataTimer;
  }

  public static async create(): Promise<ServiceRegistry> {
    const spotifyService = await SpotifyPolling.create(broadcast);
    const tabataTimer = new TabataTimer(broadcast);
    return new ServiceRegistry(spotifyService, tabataTimer);
  }
}
