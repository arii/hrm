import { AccessToken, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { ServerMessage, SpotifyData } from '../types/websocket.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import * as path from 'path';

// Utility: Safely parse JSON, fallback to text
function safeParseJSON(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input; // Return raw text if not JSON
  }
}

export type SpotifyCommand =
  | 'PLAY'
  | 'NEXT'
  | 'PREVIOUS'
  | 'LOGIN'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'PAUSE';

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface SpotifyTokenPayload {
  provider: string;
  sub: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  obtainedAt: number;
}

export interface TokenRecord {
  receivedAt: number;
  payload: SpotifyTokenPayload;
}

export class SpotifyService {
  private broadcastUpdate: (message: ServerMessage) => void;
  private sdk: SpotifyApi | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private tokenRefreshInterval: NodeJS.Timeout | null = null;
  private lastTrackId: string | null = null;
  private lastPlaybackState: boolean | null = null;
  private state: SpotifyData = {
    trackName: 'Awaiting Login...',
    artist: '',
    isPlaying: false,
  };

  private tokenFile: string;
  private currentToken: TokenRecord | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(broadcastUpdate: (message: ServerMessage) => void) {
    this.broadcastUpdate = broadcastUpdate;
    this.tokenFile = path.join(path.resolve(process.cwd(), 'logs'), 'spotify_tokens.json');
    this.loadTokens();
    logger.debug('Spotify Service Initialized.');
  }

  public async initialize() {
    await this.initializeSdk();
    this.tokenRefreshInterval = setInterval(
      () => this.checkAndRefreshSdkToken(),
      1000 * 60 * 5
    ); // Check every 5 minutes if we need to re-sync
  }

  private async initializeSdk() {
    const token = await this.getValidAccessToken();
    if (token) {
      const sdkToken = this.getSdkAccessToken();
      if (sdkToken) {
        this.setupSdk(sdkToken);
        logger.debug('Loaded existing Spotify tokens from file. Starting polling.');
        this.startPolling();
      }
    }
  }

  private setupSdk(accessToken: AccessToken) {
    this.sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || '',
      accessToken
    );
  }

  private async checkAndRefreshSdkToken() {
    const newTokenString = await this.getValidAccessToken();
    if (newTokenString && this.sdk) {
      const sdkToken = this.getSdkAccessToken();
      if (sdkToken) {
        this.setupSdk(sdkToken);
      }
    }
  }

  public getState(): SpotifyData {
    return { ...this.state };
  }

  public isReady(): boolean {
    return this.sdk !== null;
  }

  /**
   * Gets token debug information for the debug endpoint.
   * Returns null if no token is found.
   */
  public getTokenDebugInfo(): {
    userId: string;
    accessTokenPrefix: string;
    refreshTokenMasked: string;
    expiresIn: number;
    obtainedAt: string;
    expiresAt: string;
    isExpired: boolean;
    willExpireSoon: boolean;
  } | null {
    if (!this.currentToken) return null;

    const maskedRefreshToken = this.currentToken.payload.refresh_token
      ? `${this.currentToken.payload.refresh_token.substring(0, 5)}...${this.currentToken.payload.refresh_token.substring(this.currentToken.payload.refresh_token.length - 5)}`
      : 'N/A';

    const expiresAt =
      this.currentToken.payload.obtainedAt + this.currentToken.payload.expires_in * 1000;

    return {
      userId: this.currentToken.payload.sub,
      accessTokenPrefix: `${this.currentToken.payload.access_token.substring(0, 5)}...`,
      refreshTokenMasked: maskedRefreshToken,
      expiresIn: this.currentToken.payload.expires_in,
      obtainedAt: new Date(this.currentToken.payload.obtainedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      isExpired: Date.now() >= expiresAt,
      willExpireSoon: Date.now() >= expiresAt - 60000,
    };
  }

  public setRefreshToken(_token: string) {
    logger.debug('Spotify Refresh Token signal received. Reloading SDK.');
    setTimeout(() => this.initializeSdk(), 1000);
  }

  public startPolling() {
    if (this.pollInterval) return;

    const intervalMs = process.env.SPOTIFY_POLLING_INTERVAL_MS
      ? parseInt(process.env.SPOTIFY_POLLING_INTERVAL_MS, 10)
      : 3000;
    this.pollInterval = setInterval(() => this.getCurrentlyPlaying(), intervalMs);
    logger.debug(`Spotify polling started with interval: ${intervalMs}ms.`);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.debug('Spotify polling stopped.');
    }
  }

  public cleanup() {
    this.stopPolling();
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
      logger.debug('Token refresh interval cleared.');
    }
  }

  public forcePollAndBroadcast() {
    return this.getCurrentlyPlaying();
  }

  private getCurrentlyPlaying = async () => {
    if (!this.sdk) return;

    try {
      let playbackState;
      try {
        playbackState = await this.sdk.player.getCurrentlyPlayingTrack();
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: unknown }).response === 'object' &&
          (err as { response?: { text?: unknown } }).response &&
          'text' in (err as { response: { text?: unknown } }).response &&
          typeof (err as { response: { text?: unknown } }).response.text === 'function'
        ) {
          const text = await (
            err as { response: { text: () => Promise<string> } }
          ).response.text();
          const parsed = safeParseJSON(text);
          if (typeof parsed === 'object' && parsed !== null) {
            logger.error({ response: parsed }, 'Spotify API response (parsed)');
          } else {
            logger.error({ response: text }, 'Spotify API response (not JSON)');
          }
        }
        throw err;
      }

      if (!playbackState) {
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false;
          this.state = {
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          };
          this.broadcastUpdate({
            type: 'SPOTIFY_UPDATE',
            payload: this.getState(),
          });
        }
        return;
      }

      if (
        playbackState.currently_playing_type !== 'track' &&
        playbackState.currently_playing_type !== 'episode'
      ) {
        return;
      }

      const item = playbackState.item;
      const trackName = item?.name || 'Unknown Content';
      let artistName = 'Unknown Artist';
      if (item && 'artists' in item) {
        artistName = item.artists.map((a) => a.name).join(', ');
      } else if (item && 'show' in item) {
        artistName = item.show.name;
      }

      const isPlaying = playbackState.is_playing;

      if (
        item?.id !== this.lastTrackId ||
        isPlaying !== this.lastPlaybackState
      ) {
        this.lastTrackId = item?.id || null;
        this.lastPlaybackState = isPlaying;
        this.state = {
          trackName: trackName,
          artist: artistName,
          isPlaying: isPlaying,
        };
        this.broadcastUpdate({
          type: 'SPOTIFY_UPDATE',
          payload: this.getState(),
        });
      }
    } catch (error) {
      const err = error as { status?: number };
      if (err?.status === 429) {
        logger.warn('Spotify API Rate Limited. Backing off...');
        return;
      }

      if (err?.status === 401) {
        logger.warn(
          'Spotify token expired during polling. Attempting refresh.'
        );
        this.checkAndRefreshSdkToken();
        return;
      }

      logger.error({ err: error }, 'Error fetching currently playing track');
    }
  };

  public async getAvailableDevices() {
    if (!this.sdk) {
      logger.warn('Cannot get devices: SDK not initialized.');
      return [];
    }
    try {
      const response = await this.sdk.player.getAvailableDevices();
      return response.devices;
    } catch (error) {
      logger.error({ err: error }, 'Error fetching Spotify devices');
      return [];
    }
  }

  public handleCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    if (!this.sdk) {
      logger.warn('Cannot execute command: SDK not initialized.');
      return Promise.resolve();
    }

    return (async () => {
      try {
        await this.executeSpotifyCommand(command, deviceId, volume, playlistUri);
        setTimeout(() => this.getCurrentlyPlaying(), 500);
      } catch (error) {
        this.logSpotifyCommandError(command, error);
      }
    })();
  }

  private async executeSpotifyCommand(
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number,
    playlistUri?: string
  ) {
    switch (command) {
      case 'PLAY':
        if (playlistUri) {
          await this.sdk!.player.startResumePlayback(
            (deviceId || undefined) as unknown as string,
            playlistUri
          );
        } else {
          await this.sdk!.player.startResumePlayback(
            (deviceId || undefined) as unknown as string
          );
        }
        break;
      case 'PAUSE':
        await this.sdk!.player.pausePlayback(
          (deviceId || undefined) as unknown as string
        );
        break;
      case 'NEXT':
        await this.sdk!.player.skipToNext(
          (deviceId || undefined) as unknown as string
        );
        break;
      case 'PREVIOUS':
        await this.sdk!.player.skipToPrevious(
          (deviceId || undefined) as unknown as string
        );
        break;
      case 'TRANSFER_PLAYBACK':
        if (deviceId) {
          await this.sdk!.player.transferPlayback([deviceId], true);
        }
        break;
      case 'SET_VOLUME':
        if (volume !== undefined) {
          const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
          await this.sdk!.player.setPlaybackVolume(clampedVolume, deviceId);
        }
        break;
      case 'LOGIN':
        logger.debug('Received LOGIN command.');
        break;
      default:
        logger.warn(`Unknown Spotify command: ${command}`);
    }
  }

  private async logSpotifyCommandError(
    command: SpotifyCommand,
    error: unknown
  ) {
    try {
      if (error instanceof SyntaxError) {
        logger.warn(
          `[SpotifyService] Command ${command} executed, but response was not valid JSON (likely 204 No Content). SyntaxError suppressed.`
        );
      } else if (error && typeof error === 'object') {
        if (
          'response' in error &&
          (error as { response?: { text?: () => Promise<string> } }).response
        ) {
          try {
            let text = '[No response text available]';
            if (
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof (error as { response?: unknown }).response === 'object' &&
              (error as { response?: { text?: unknown } }).response &&
              'text' in (error as { response: { text?: unknown } }).response &&
              typeof (error as { response: { text?: unknown } }).response.text === 'function'
            ) {
              try {
                text = await (
                  error as { response: { text: () => Promise<string> } }
                ).response.text();
              } catch (textError) {
                logger.error(
                  { err: textError },
                  `Error executing Spotify command ${command}: Failed to retrieve error response text:`
                );
                logger.error(
                  { err: error },
                  `Error executing Spotify command ${command}:`
                );
                return;
              }

              const parsed = safeParseJSON(text);
              if (typeof parsed === 'object' && parsed !== null) {
                logger.error(
                  { response: parsed },
                  `Error executing Spotify command ${command}: Parsed response:`
                );
              } else {
                logger.error(
                  { response: text },
                  `Error executing Spotify command ${command}: Response body:`
                );
              }
            }
          } catch (e) {
            logger.error(
              { err: e },
              `Error executing Spotify command ${command}: Could not read response body.`
            );
          }
        } else {
          logger.error(
            { err: error },
            `Error executing Spotify command ${command}:`
          );
        }
      } else {
        logger.error(
          { err: error },
          `Error executing Spotify command ${command}:`
        );
      }
    } catch (loggingError) {
      logger.error(
        { err: loggingError },
        `Error executing Spotify command ${command}: (Logging failed)`
      );
      logger.error({ err: error }, `Original error for ${command}:`);
    }
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        this.currentToken = JSON.parse(data) as TokenRecord;
        logger.info('Loaded Spotify tokens for: %s', this.currentToken.payload.sub);
      }
    } catch (err) {
      logger.warn('Failed to load Spotify tokens:', err);
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.payload.refresh_token) return false;

    try {
      const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.currentToken.payload.refresh_token,
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      logger.info(
        'Spotify token refresh successful. Status: %s, Body: %j',
        response.status,
        data
      );

      this.currentToken = {
        receivedAt: Date.now(),
        payload: {
          ...this.currentToken.payload,
          access_token: data.access_token,
          expires_in: data.expires_in,
          refresh_token:
            data.refresh_token ?? this.currentToken.payload.refresh_token,
          obtainedAt: Date.now(),
        },
      };

      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(this.currentToken, null, 2),
        'utf8'
      );

      logger.info('Refreshed Spotify token for:', this.currentToken.payload.sub);
      return true;
    } catch (err) {
      logger.error('Failed to refresh Spotify token:', err);
      return false;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    this.loadTokens();
    if (!this.currentToken) return null;

    const expiresAt =
      this.currentToken.payload.obtainedAt +
      this.currentToken.payload.expires_in * 1000;

    if (Date.now() >= expiresAt - 60000) {
      logger.info(
        'Spotify access token is expiring soon, initiating refresh...'
      );
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshToken()
          .then(() => {
            this.refreshPromise = null;
            logger.info('Spotify access token refresh completed.');
          })
          .catch((error) => {
            this.refreshPromise = null;
            logger.error('Spotify access token refresh failed:', error);
          });
      }
      await this.refreshPromise;
    }

    return this.currentToken.payload.access_token;
  }

  getSdkAccessToken(): AccessToken | null {
    if (!this.currentToken) return null;
    return {
      access_token: this.currentToken.payload.access_token,
      token_type: 'Bearer',
      expires_in: this.currentToken.payload.expires_in,
      refresh_token: this.currentToken.payload.refresh_token,
      expires:
        this.currentToken.payload.obtainedAt +
        this.currentToken.payload.expires_in * 1000,
    };
  }
}

let spotifyServiceInstance: SpotifyService;

export const initializeSpotifyService = async (broadcastUpdate: (message: ServerMessage) => void) => {
  if (!spotifyServiceInstance) {
    spotifyServiceInstance = new SpotifyService(broadcastUpdate);
    await spotifyServiceInstance.initialize();
  }
  return spotifyServiceInstance;
};

export const getSpotifyService = () => {
  if (!spotifyServiceInstance) {
    throw new Error('Spotify service not initialized');
  }
  return spotifyServiceInstance;
};

/**
 * Resets the spotify service singleton for testing purposes.
 * Only call this in test teardown.
 */
export const resetSpotifyService = () => {
  if (spotifyServiceInstance) {
    spotifyServiceInstance.cleanup();
  }
  spotifyServiceInstance = undefined as unknown as SpotifyService;
};
