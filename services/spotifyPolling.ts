// File: services/spotifyPolling.ts (Spotify Polling Service - Typed)
/**
 * Spotify Polling Service: Handles token management, REST polling, and command execution.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */
import fetch from "node-fetch";
import { SpotifyData, UnifiedStateMessage } from "../types/websocket";
import { SpotifyTokenManager } from "./spotifyTokenManager";

// API endpoint constants
const BASE_URL = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

type SpotifyCommand = "PLAY" | "PAUSE" | "NEXT" | "PREVIOUS" | "LOGIN";

export class SpotifyPolling {
  private tokenManager: SpotifyTokenManager;
  private pollInterval: NodeJS.Timeout | null = null;

  // Internal auth/state values
  private refreshToken: string | null = null;
  private accessToken: string | null = null;
  private broadcastState: (data: Partial<UnifiedStateMessage>) => void;

  private lastTrackId: string | null = null;
  private lastPlaybackState: boolean | null = null;

  private state: SpotifyData = {
    trackName: "Awaiting Login...",
    artist: "",
    isPlaying: false,
  };

  constructor(broadcastState: (data: Partial<UnifiedStateMessage>) => void) {
    this.broadcastState = broadcastState;
    console.log("Spotify Polling Service Initialized.");

    this.tokenManager = new SpotifyTokenManager(
      process.env.SPOTIFY_CLIENT_ID || "",
      process.env.SPOTIFY_CLIENT_SECRET || ""
    );

    // Start token refresh check loop (Every 55 mins)
    setInterval(() => this.refreshAccessToken(), 1000 * 60 * 55);
  }

  public getState(): SpotifyData {
    return { ...this.state };
  }

  // --- Token Management (Used by NextAuth route) ---

  /**
   * Called by server.js POST /internal/token-delivery after NextAuth provides the refresh token.
   */
  public setRefreshToken(token: string) {
    this.refreshToken = token;
    console.log(
      "Spotify Refresh Token received. Attempting initial access token refresh."
    );
    this.refreshAccessToken(true);
  }

  private async refreshAccessToken(initial: boolean = false): Promise<void> {
    if (!this.refreshToken) {
      if (!initial) {
        this.broadcastState({
          spotifyData: {
            trackName: "Requires Login",
            artist: "Please log in via client/control",
            isPlaying: false,
          },
        });
      }
      return;
    }

    // Generate Base64 string for Authorization header
    const authString = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorBody}`);
      }

      const data: any = await response.json();
      this.accessToken = data.access_token;
      console.log("Spotify Access Token refreshed successfully. Status:", response.status, "Body:", data);

      // Start polling if not already running
      if (!this.pollInterval) {
        this.startPolling();
      }
    } catch (error) {
      console.error("Error during Spotify token refresh:", error);
      this.accessToken = null;
      this.stopPolling();
    }
  }

  // --- Polling Logic ---

  // Expose start/stop polling publicly (used by server to control lifecycle)
  public startPolling(intervalMs: number = 3000) {
    if (this.pollInterval) return;
    // Poll every `intervalMs` for low-latency updates
    this.pollInterval = setInterval(this.getCurrentlyPlaying, intervalMs);
    console.log("Spotify polling started.");
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log("Spotify polling stopped.");
    }
  }

  private getCurrentlyPlaying = async () => {
    if (!this.accessToken) return;

    const maskedAccessToken = this.accessToken.substring(0, 5) + "...";
    console.log("Fetching currently playing track with access token:", maskedAccessToken);

    try {
      const response = await fetch(`${BASE_URL}/me/player/currently-playing`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 204) {
        console.log("Currently playing: No content (204).");
        // 204 No Content - nothing is playing on the user's account
        if (this.lastPlaybackState !== false) {
          this.lastPlaybackState = false;
          this.state = {
            trackName: "Nothing is currently playing.",
            artist: "",
            isPlaying: false,
          };
          this.broadcastState({ spotifyData: this.getState() });
        }
        return;
      }

      const responseBody = await response.text();
      if (!response.ok) {
        console.error("Error fetching currently playing track. Status:", response.status, "Body:", responseBody);
        if (response.status === 401) {
          console.warn(
            "Spotify token expired or invalid. Attempting refresh..."
          );
          this.refreshAccessToken();
        }
        return;
      }

      const data = JSON.parse(responseBody) as any;
      console.log("Successfully fetched currently playing track. Data:", data);

      // Only broadcast if track ID or playback state has changed
      if (
        data.item?.id !== this.lastTrackId ||
        data.is_playing !== this.lastPlaybackState
      ) {
        this.lastTrackId = data.item?.id;
        this.lastPlaybackState = data.is_playing;
        this.state = {
          trackName: data.item?.name || "Unknown Track",
          artist: data.item?.artists?.[0]?.name || "Unknown Artist",
          isPlaying: data.is_playing,
        };
        this.broadcastState({ spotifyData: this.getState() });
      }
    } catch (error) {
      console.error("Error fetching currently playing track:", error);
    }
  };

  // --- Command Handling (Used by socketManager) ---

  private async executePlayerCommand(endpoint: string, method: "POST" | "PUT") {
    if (!this.accessToken) {
      console.warn(
        "Cannot execute command: Access token is missing. Requires login."
      );
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/me/player/${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 204) {
        console.log(`Spotify command '${endpoint}' executed successfully.`);
        // Immediately poll after a successful command to update the dashboard faster
        setTimeout(this.getCurrentlyPlaying, 500);
      } else {
        console.error(
          `Spotify command failed (${response.status}): ${endpoint}`
        );
      }
    } catch (error) {
      console.error("Error executing Spotify command:", error);
    }
  }

  public handleCommand(command: SpotifyCommand) {
    switch (command) {
      case "PAUSE":
        this.executePlayerCommand("pause", "PUT");
        break;
      case "PLAY":
        this.executePlayerCommand("play", "PUT");
        break;
      case "NEXT":
        this.executePlayerCommand("next", "POST");
        break;
      case "PREVIOUS":
        this.executePlayerCommand("previous", "POST");
        break;
      case "LOGIN":
        // Note: The actual login is handled by the client redirecting to NextAuth.
        // This command is primarily for client-side feedback.
        console.log(
          "Received LOGIN command. Client should initiate NextAuth sign-in."
        );
        break;
      default:
        console.warn(`Unknown Spotify command: ${command}`);
    }
  }

  async getCurrentPlayback(): Promise<any> {
    const accessToken = await this.tokenManager.getValidAccessToken();
    if (!accessToken) {
      throw new Error("No valid Spotify access token available");
    }

    const response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid - force a refresh on next attempt
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async controlPlayback(
    action: "play" | "pause" | "next" | "previous"
  ): Promise<boolean> {
    const accessToken = await this.tokenManager.getValidAccessToken();
    if (!accessToken) return false;

    const endpoint = {
      play: "/play",
      pause: "/pause",
      next: "/next",
      previous: "/previous",
    }[action];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (err) {
      console.error("Spotify playback control failed:", err);
      return false;
    }
  }

  // (Legacy duplicate start/stop removed — public startPolling/stopPolling above are used.)
}

export default SpotifyPolling;
