"use client";

import { useCallback, useEffect, useState } from "react";

// Define event data types for better type safety
interface SpotifyDeviceEvent {
  device_id: string;
}

interface SpotifyErrorEvent {
  message: string;
}

// Define a minimal interface for the Spotify Player
// This will be expanded as we integrate more features.
interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener(
    event: "ready" | "not_ready",
    callback: (data: SpotifyDeviceEvent) => void
  ): void;
  addListener(
    event: "initialization_error" | "authentication_error" | "account_error",
    callback: (data: SpotifyErrorEvent) => void
  ): void;
  removeListener: (event: string) => void;
  _options: {
    id: string;
    name: string;
  };
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume: number;
}

// Define the structure for the window object to include the Spotify SDK properties
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

/**
 * A custom hook to manage the Spotify Web Playback SDK.
 *
 * This hook handles:
 * - Dynamically loading the Spotify Player SDK script.
 * - Initializing the player.
 * - Fetching the OAuth token securely from our backend.
 * - Managing player state (ready, device ID, errors).
 * - Exposing the player instance and its state to components.
 */
const useSpotifyWebPlayback = () => {
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the Spotify OAuth token from our secure backend API.
   * This function is passed to the Spotify Player constructor.
   */
  const getOAuthToken = useCallback(async (cb: (token: string) => void) => {
    try {
      // This endpoint will be created in the next step.
      const response = await fetch("/api/spotify/access-token");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch Spotify access token: ${response.status} ${errorText}`
        );
      }
      const { accessToken } = await response.json();
      if (!accessToken) {
        throw new Error("Access token was not found in the response.");
      }
      cb(accessToken);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Authentication failed: ${message}`);
      console.error(`[Spotify Web Playback] getOAuthToken error: ${message}`);
    }
  }, []);

  // Effect to load the Spotify SDK script and initialize the player
  useEffect(() => {
    // Prevent re-initialization
    if (player || window.Spotify) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);

    // This function is called by the Spotify SDK once it's loaded.
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "HRM Web Player",
        getOAuthToken,
        volume: 0.5,
      });

      // --- Player Event Listeners ---

      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("[Spotify Web Playback] Ready with Device ID", device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setError(null);
      });

      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log(
          "[Spotify Web Playback] Device ID has gone offline",
          device_id
        );
        setIsReady(false);
        setDeviceId(null);
      });

      spotifyPlayer.addListener("initialization_error", ({ message }) => {
        console.error("[Spotify Web Playback] Initialization Error:", message);
        setError(`Initialization failed: ${message}`);
      });

      spotifyPlayer.addListener("authentication_error", ({ message }) => {
        console.error("[Spotify Web Playback] Authentication Error:", message);
        setError(`Authentication failed: ${message}`);
      });

      spotifyPlayer.addListener("account_error", ({ message }) => {
        console.error("[Spotify Web Playback] Account Error:", message);
        setError(`Account error: ${message}. A Premium account is required.`);
      });

      setPlayer(spotifyPlayer);

      // --- Connect the Player ---
      spotifyPlayer.connect().then((success) => {
        if (success) {
          console.log(
            "[Spotify Web Playback] The Web Playback SDK successfully connected to Spotify!"
          );
        }
      });
    };

    // Cleanup function to disconnect the player when component unmounts
    return () => {
      // @ts-expect-error - player is guaranteed to be SpotifyPlayer when set
      if (player && typeof player.disconnect === "function") {
        // @ts-expect-error - disconnect exists on SpotifyPlayer
        player.disconnect();
      }
    };
    // We intentionally omit 'player' from deps to prevent re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOAuthToken]);

  return { player, isReady, deviceId, error };
};

export default useSpotifyWebPlayback;
