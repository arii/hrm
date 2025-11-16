// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */
import { SpotifyData, UnifiedStateMessage } from "../types/websocket.js";
import { UserTokenManager } from "./userTokenManager.js";
import {
  getCurrentlyPlaying,
  getAvailableDevices,
} from "./spotify/spotifyApi.js";
import { handleCommand } from "./spotify/spotifyCommandHandler.js";
import {
  SpotifyCurrentlyPlayingResponse,
  SpotifyDevice,
} from "../types/spotify.js";

type SpotifyCommand =
  | "PLAY"
  | "PAUSE"
  | "NEXT"
  | "PREVIOUS"
  | "TRANSFER_PLAYBACK"
  | "SET_VOLUME";

export class SpotifyPolling {
  private tokenManager: UserTokenManager;
  private pollInterval: NodeJS.Timeout | null = null;
  public broadcastState: (
    data: Partial<UnifiedStateMessage>,
    userId?: string
  ) => void;

  // Per-user state
  private userStates: Map<
    string,
    {
      lastTrackId: string | null;
      lastPlaybackState: boolean | null;
      state: SpotifyData;
    }
  > = new Map();

  constructor(
    broadcastState: (
      data: Partial<UnifiedStateMessage>,
      userId?: string
    ) => void
  ) {
    this.broadcastState = broadcastState;
    console.log("Spotify Polling Service Initialized.");

    this.tokenManager = new UserTokenManager(
      process.env.SPOTIFY_CLIENT_ID || "",
      process.env.SPOTIFY_CLIENT_SECRET || ""
    );
  }

  // --- User-specific State Management ---

  private getUserState(userId: string) {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        lastTrackId: null,
        lastPlaybackState: null,
        state: {
          trackName: "Awaiting Login...",
          artist: "",
          isPlaying: false,
        },
      });
    }
    return this.userStates.get(userId)!;
  }

  // --- Polling Logic ---

  /**
   * Fetches the currently playing track for a specific user and broadcasts it.
   */
  public async getCurrentlyPlaying(
    userId: string,
    encryptedRefreshToken: string
  ): Promise<void> {
    const accessToken = await this.tokenManager.getValidAccessTokenForUser(
      userId,
      encryptedRefreshToken
    );
    if (!accessToken) {
      this.broadcastState(
        {
          spotifyData: {
            trackName: "Login Required",
            artist: "Please log in to Spotify.",
            isPlaying: false,
          },
        },
        userId
      );
      return;
    }

    try {
      const data = await getCurrentlyPlaying(accessToken);
      const userState = this.getUserState(userId);

      if (!data) {
        // Nothing is playing
        if (userState.lastPlaybackState !== false) {
          userState.lastPlaybackState = false;
          userState.state = {
            trackName: "Nothing is currently playing.",
            artist: "",
            isPlaying: false,
          };
          this.broadcastState({ spotifyData: userState.state }, userId);
        }
        return;
      }

      // Only broadcast if track or playback state has changed
      if (
        data.item?.id !== userState.lastTrackId ||
        data.is_playing !== userState.lastPlaybackState
      ) {
        userState.lastTrackId = data.item?.id;
        userState.lastPlaybackState = data.is_playing;
        userState.state = {
          trackName: data.item?.name || "Unknown Track",
          artist: data.item?.artists?.[0]?.name || "Unknown Artist",
          isPlaying: data.is_playing,
        };
        this.broadcastState({ spotifyData: userState.state }, userId);
      }
    } catch (error) {
      console.error(
        `Error fetching currently playing track for ${userId}:`,
        error
      );
    }
  }

  public async getAvailableDevices(
    userId: string,
    encryptedRefreshToken: string
  ): Promise<SpotifyDevice[]> {
    const accessToken = await this.tokenManager.getValidAccessTokenForUser(
      userId,
      encryptedRefreshToken
    );
    if (!accessToken) {
      console.warn(`Cannot get devices for user ${userId}: Access token is missing.`);
      return [];
    }
    try {
      return await getAvailableDevices(accessToken);
    } catch (error) {
      console.error(`Error fetching Spotify devices for user ${userId}:`, error);
      return [];
    }
  }
  // --- Command Handling (Used by socketManager) ---

  public async handleCommand(
    userId: string,
    encryptedRefreshToken: string,
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number
  ) {
    await handleCommand(
      this.tokenManager,
      userId,
      encryptedRefreshToken,
      command,
      deviceId,
      volume
    );

    // Immediately poll to update the dashboard faster
    setTimeout(() => this.getCurrentlyPlaying(userId, encryptedRefreshToken), 500);
  }
}

export default SpotifyPolling;
