// File: services/spotifyPlaylistService.ts
/**
 * Spotify Playlist Service: Handles playlist-related operations.
 * This service now uses the centralized SpotifyClient for all API interactions.
 */
import { SpotifyPlaylistItem, SpotifyPlaylist } from '../types/index'
import { presetPlaylists } from './seedData'
import { SpotifyClient } from './spotify/spotifyClient'
import logger from '../utils/logger'

// Re-export types for backward compatibility
export type { SpotifyPlaylistItem, SpotifyPlaylist }

/**
 * Returns a list of preset workout playlists.
 * @returns {SpotifyPlaylistItem[]} A list of preset playlists.
 */
export function getPresetPlaylists(): SpotifyPlaylistItem[] {
  return presetPlaylists
}

/**
 * Fetches the current user's playlists from the Spotify API.
 * This function relies on the SpotifyClient to provide an authenticated SDK instance.
 *
 * @param {SpotifyClient} spotifyClient - The centralized Spotify client instance.
 * @returns {Promise<SpotifyPlaylistItem[]>} A promise that resolves to a list of the user's playlists.
 */
export async function getUserPlaylists(
  spotifyClient: SpotifyClient
): Promise<SpotifyPlaylistItem[]> {
  try {
    const sdk = await spotifyClient.getSdk()
    const response = await sdk.currentUser.playlists.playlists(50) // Fetch up to 50 playlists

    return response.items.map((item) => ({
      id: item.id,
      name: item.name,
      uri: item.uri,
    }))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user playlists.')
    return []
  }
}
