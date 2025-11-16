// File: services/spotify/spotifyApi.ts
import fetch from "node-fetch";
import {
  SpotifyCurrentlyPlayingResponse,
  SpotifyDevice,
  SpotifyDevicesResponse,
} from "../../types/spotify";

const BASE_URL = "https://api.spotify.com/v1";

export const getCurrentlyPlaying = async (
  accessToken: string
): Promise<SpotifyCurrentlyPlayingResponse | null> => {
  const response = await fetch(`${BASE_URL}/me/player/currently-playing`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Error fetching currently playing: ${response.status}`
    );
  }

  return response.json() as Promise<SpotifyCurrentlyPlayingResponse>;
};

export const getAvailableDevices = async (
  accessToken: string
): Promise<SpotifyDevice[]> => {
  const response = await fetch(`${BASE_URL}/me/player/devices`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch devices: ${response.status}`);
  }

  const data = (await response.json()) as SpotifyDevicesResponse;
  return data.devices;
};

export const executePlayerCommand = async (
  accessToken: string,
  endpoint: string,
  method: "POST" | "PUT",
  body?: Record<string, unknown>
): Promise<boolean> => {
  const url = new URL(`${BASE_URL}/me/player/${endpoint}`);
  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.status === 204;
};
