// File: lib/api.ts
/**
 * Centralized API service for client-side data fetching.
 * Consolidates all fetch calls to ensure consistency in error handling,
 * typing, and request/response logic.
 */

import { SpotifyDevice } from '@/types/index'

/**
 * Custom error class for API requests.
 * Contains the HTTP status code for more specific error handling.
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * A generic fetch wrapper to handle common API request logic.
 * @param endpoint - The API endpoint to call (e.g., '/api/spotify/devices').
 * @param options - Optional Fetch API options.
 * @returns The JSON response as a promise.
 * @throws An ApiError if the network response is not ok.
 */
const apiFetch = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(endpoint, options)

  if (!response.ok) {
    const errorText = await response.text()
    throw new ApiError(
      `API request failed to ${endpoint}: ${errorText}`,
      response.status
    )
  }

  // Handle cases with no JSON body (e.g., 204 No Content)
  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

// --- Spotify API ---

/**
 * Fetches the Spotify access token from the backend.
 * @returns An object containing the accessToken.
 */
export const getSpotifyAccessToken = async (): Promise<{
  accessToken: string
}> => {
  return apiFetch<{ accessToken: string }>('/api/spotify/access-token')
}

/**
 * Fetches the list of available Spotify devices.
 * @returns A promise that resolves to an array of SpotifyDevice objects.
 */
export const getSpotifyDevices = async (): Promise<SpotifyDevice[]> => {
  const devices = await apiFetch<SpotifyDevice[]>('/api/spotify/devices')
  return Array.isArray(devices) ? devices : []
}
