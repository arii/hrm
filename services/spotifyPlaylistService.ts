// File: services/spotifyPlaylistService.ts
/**
 * Spotify Playlist Service: Handles playlist-related operations for the standalone Spotify page.
 * This service is used by the standalone playlist selection page.
 */
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk'
import { SpotifyPlaylistItem, SpotifyPlaylist } from '../types'
import { presetPlaylists } from './seedData'

// Re-export types for backward compatibility
export type { SpotifyPlaylistItem, SpotifyPlaylist }

/**
 * Returns a list of preset workout playlists.
 */
export function getPresetPlaylists(): SpotifyPlaylistItem[] {
  return presetPlaylists
}

/**
 * Fetches user playlists from Spotify API.
 * This is used by the standalone Spotify playlist selection page.
 */
export async function getUserPlaylists(
  accessToken: string
): Promise<SpotifyPlaylistItem[]> {
  if (!accessToken) {
    console.warn('Cannot get user playlists: Access token is missing.')
    return []
  }
  try {
    // We need to construct an AccessToken object for the SDK
    // Since we only have the string, we assume it's valid and expiration is handled by caller or ignored for this one-shot call.
    // The SDK requires the full object structure.
    const tokenObject: AccessToken = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Dummy value, as we likely won't refresh inside this short-lived instance
      refresh_token: '',
      expires: Date.now() + 3600 * 1000,
    }

    const sdk = SpotifyApi.withAccessToken(
      process.env.SPOTIFY_CLIENT_ID || 'client_id_placeholder', // Client ID is needed even if we have token? Yes, usually.
      tokenObject
    )

    // Fetch playlists
    const response = await sdk.currentUser.playlists.playlists(50)

    return response.items.map((item) => ({
      id: item.id,
      name: item.name,
      uri: item.uri,
    }))
  } catch (error) {
    console.error('Error fetching user playlists:', error)
    return []
  }
}
