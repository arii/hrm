// File: services/spotifyApiService.ts (NEW)
/**
 * Spotify API Service
 *
 * This service encapsulates all interactions with the Spotify Web API. It is
 * designed to be used by Next.js API routes and other server-side components.
 * By centralizing the API logic here, we keep the route handlers clean and
 * focused on handling HTTP requests and responses.
 *
 * It handles:
 * - Fetching access tokens.
 * - Controlling playback (play, pause, next, previous).
 * - Getting available devices.
 * - Transferring playback to a different device.
 */
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { Session } from 'next-auth'

/**
 * Result type for service methods to standardize return values.
 */
type ServiceResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      status: number
    }

/**
 * Retrieves the Spotify access token from the current user's session.
 *
 * This function encapsulates the logic for obtaining the server-side session
 * and safely extracting the access token, including checks for token refresh
 * errors from NextAuth.
 *
 * @returns A ServiceResult containing the access token on success, or an error
 *          object on failure.
 */
export const getAccessToken = async (): Promise<
  ServiceResult<{ accessToken: string }>
> => {
  try {
    const session: Session | null = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return {
        success: false,
        error: 'Not authenticated or token is missing.',
        status: 401,
      }
    }

    if (session.error === 'RefreshAccessTokenError') {
      return {
        success: false,
        error: 'Token refresh failed. Please re-authenticate.',
        status: 401,
      }
    }

    return {
      success: true,
      data: { accessToken: session.accessToken },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(
      `[SpotifyApiService] Internal Server Error in getAccessToken: ${message}`
    )
    return {
      success: false,
      error: 'Internal Server Error',
      status: 500,
    }
  }
}

/**
 * Fetches the list of available Spotify devices.
 *
 * @returns A ServiceResult containing the list of devices on success, or an
 *         error object on failure.
 */
import { SpotifyDevice } from '@/types/index'
export const getDevices = async (): Promise<
  ServiceResult<{ devices: SpotifyDevice[] }>
> => {
  const tokenResult = await getAccessToken()
  if (!tokenResult.success) {
    return tokenResult
  }

  const { accessToken } = tokenResult.data

  try {
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error?.message || 'Failed to fetch devices',
        status: response.status,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(
      `[SpotifyApiService] Internal Server Error in getDevices: ${message}`
    )
    return {
      success: false,
      error: 'Internal Server Error',
      status: 500,
    }
  }
}

/**
 * Sends a player command (e.g., PLAY, PAUSE) to the Spotify API.
 *
 * @param command The player command to execute.
 * @returns A ServiceResult indicating success or failure.
 */
import { spotifyControlSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

type PlayerCommand = z.infer<typeof spotifyControlSchema>['command']

export const sendPlayerCommand = async (
  command: PlayerCommand,
  deviceId?: string,
  volume?: number
): Promise<ServiceResult<{ success: true; message: string }>> => {
  const tokenResult = await getAccessToken()
  if (!tokenResult.success) {
    return tokenResult
  }

  const { accessToken } = tokenResult.data
  const SPOTIFY_API_BASE = 'https://api.spotify.com/v1/me/player'
  let endpoint = ''
  let method = ''
  let body

  switch (command) {
    case 'PLAY':
      endpoint = 'play'
      method = 'PUT'
      break
    case 'PAUSE':
      endpoint = 'pause'
      method = 'PUT'
      break
    case 'NEXT':
      endpoint = 'next'
      method = 'POST'
      break
    case 'PREVIOUS':
      endpoint = 'previous'
      method = 'POST'
      break
    case 'TRANSFER_PLAYBACK':
      endpoint = ''
      method = 'PUT'
      body = JSON.stringify({ device_ids: [deviceId] })
      break
    case 'SET_VOLUME':
      endpoint = `volume?volume_percent=${volume}`
      method = 'PUT'
      break
  }

  try {
    const requestOptions: RequestInit = {
      method: method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
    if (body) {
      requestOptions.body = body
    }
    const response = await fetch(
      `${SPOTIFY_API_BASE}/${endpoint}`,
      requestOptions
    )

    if (response.status === 204) {
      return {
        success: true,
        data: { success: true, message: `Command '${command}' executed.` },
      }
    }

    const errorData = await response.json()
    return {
      success: false,
      error: errorData.error?.message || 'Unknown Spotify API error',
      status: response.status,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(
      `[SpotifyApiService] Internal Server Error in sendPlayerCommand: ${message}`
    )
    return {
      success: false,
      error: 'Internal Server Error',
      status: 500,
    }
  }
}
