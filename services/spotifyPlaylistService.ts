// File: services/spotifyPlaylistService.ts
/**
 * Spotify Playlist Service: Handles playlist-related operations for the standalone Spotify page.
 * This service is used by the standalone playlist selection page.
 */
import { SpotifyPlaylistItem, SpotifyPlaylist } from '../types/index'
import { presetPlaylists } from './seedData'
import { spotifyApi } from './spotifyApi'
import logger from '../utils/logger'

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
export async function getUserPlaylists(): Promise<SpotifyPlaylistItem[]> {
  try {
    const sdk = await spotifyApi.getSdk()
    const response = await sdk.currentUser.playlists.playlists(50)

    return response.items.map((item) => ({
      id: item.id,
      name: item.name,
      uri: item.uri,
    }))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user playlists')
    return []
  }
}
