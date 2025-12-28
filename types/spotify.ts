// types/spotify.ts

/**
 * Represents a single track in a Spotify playlist.
 */
export interface Track {
  uri: string;
  name: string;
  artist: string;
  duration: number;
}

/**
 * Represents a Spotify playlist.
 * This interface is used across the application, from API responses to frontend components.
 */
export interface Playlist {
  name: string;
  uri: string;
  id?: string;
  imageUrl?: string | null;
  description?: string | null;
  trackCount?: number;
  owner?: string;
  isPreset?: boolean;
  isSearchResult?: boolean;
}

/**
 * Represents the detailed view of a playlist, including its tracks.
 */
export interface PlaylistDetailsData extends Omit<Playlist, 'trackCount' | 'owner'> {
  tracks: Track[];
}
