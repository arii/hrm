// services/spotifyApi.ts
import {
  SpotifyCurrentlyPlayingResponse,
  SpotifyDevice,
  SpotifyDevicesResponse,
} from '../types/spotify'

const BASE_URL = 'https://api.spotify.com/v1'

async function fetchSpotifyAPI<T>(
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: unknown
): Promise<T | null> {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Spotify API Error: ${response.status} ${response.statusText} - ${errorBody}`
    )
  }

  return response.json() as Promise<T>
}

export const getCurrentlyPlaying = (
  accessToken: string
): Promise<SpotifyCurrentlyPlayingResponse | null> => {
  return fetchSpotifyAPI<SpotifyCurrentlyPlayingResponse>(
    '/me/player/currently-playing',
    accessToken
  )
}

export const getAvailableDevices = async (
  accessToken: string
): Promise<SpotifyDevice[]> => {
  const response = await fetchSpotifyAPI<SpotifyDevicesResponse>(
    '/me/player/devices',
    accessToken
  )
  return response?.devices || []
}

export const setVolume = (
  accessToken: string,
  volume: number,
  deviceId?: string
): Promise<null> => {
  const safeVolume = Math.max(0, Math.min(100, Math.round(volume)))
  let endpoint = `/me/player/volume?volume_percent=${safeVolume}`
  if (deviceId) {
    endpoint += `&device_id=${deviceId}`
  }
  return fetchSpotifyAPI(endpoint, accessToken, 'PUT')
}

export const transferPlayback = (
  accessToken: string,
  deviceId: string
): Promise<null> => {
  return fetchSpotifyAPI(
    '/me/player',
    accessToken,
    'PUT',
    {
      device_ids: [deviceId],
      play: true,
    }
  )
}

export const executePlayerCommand = (
  accessToken: string,
  endpoint: 'play' | 'pause' | 'next' | 'previous',
  method: 'PUT' | 'POST',
  deviceId?: string,
): Promise<null> => {
  let url = `/me/player/${endpoint}`
  if (deviceId) {
    url += `?device_id=${deviceId}`
  }
  return fetchSpotifyAPI(url, accessToken, method)
}
