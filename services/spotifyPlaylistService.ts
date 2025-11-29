// File: services/spotifyPlaylistService.ts
/**
 * Spotify Playlist Service: Handles playlist-related operations for the standalone Spotify page.
 * This service is used by the standalone playlist selection page.
 */
import { SpotifyApiService } from './spotifyApi.js'
import { SpotifyPlaylistItem, SpotifyPlaylist } from '../types/index'
import { presetPlaylists } from './seedData.js'
import logger from '../utils/logger.js'

// Re-export types for backward compatibility
export type { SpotifyPlaylistItem, SpotifyPlaylist }

/**
 * Returns a list of preset workout playlists.
 */
export function getPresetPlaylists(): SpotifyPlaylistItem[] {
  return presetPlaylists
}

/**
 * Fetches user playlists from the Spotify API using the centralized service.
 */
export async function getUserPlaylists(): Promise<SpotifyPlaylistItem[]> {
  const spotifyApiService = SpotifyApiService.getInstance()
  const sdk = spotifyApiService.getSdk()

  if (!sdk) {
    logger.warn('Cannot get user playlists: Spotify SDK not initialized.')
    return []
  }

  try {
    const response = await sdk.currentUser.playlists.playlists(50)
    return response.items.map((item) => ({
      id: item.id,
      name: item.name,
      uri: item.uri,
    }))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user playlists')
    // Handle potential token expiration
    const err = error as { status?: number }
    if (err?.status === 401) {
      logger.warn('Spotify token expired while fetching playlists. Attempting refresh.')
      await spotifyApiService.getTokenManager().refreshToken()
      // Optionally, you could retry the request here, but for now, we'll let the next call handle it.
    }
    return []
  }
}
