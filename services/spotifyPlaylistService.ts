// File: services/spotifyPlaylistService.ts
/**
 * Spotify Playlist Service: Handles playlist-related operations for the standalone Spotify page.
 * This service is used by the standalone playlist selection page.
 */

export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

export interface SpotifyPlaylist {
  name: string
  uri: string
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[]
}

const BASE_URL = 'https://api.spotify.com/v1'

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
    const response = await fetch(`${BASE_URL}/me/playlists`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch user playlists: ${response.status}`)
    }
    const data = (await response.json()) as SpotifyPlaylistsResponse
    return data.items
  } catch (error) {
    console.error('Error fetching user playlists:', error)
    return []
  }
}
<<<<<<< HEAD
=======

>>>>>>> 554cd5b84ebff42a5b01602823e73c3c3b2a3407
