// types/spotify.ts

export interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string }
  imageUrl?: string | null
}

export interface Playlist {
  name: string
  uri: string
  id?: string
  isPreset?: boolean
  isSearchResult?: boolean
  imageUrl?: string | null
  description?: string | null
  trackCount?: number
  owner?: string
}

/**
 * Represents a single device available for Spotify playback.
 * This interface is based on the Device object from the Spotify Web API.
 * @see https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices
 *
 * @property {string} id - The device ID.
 * @property {boolean} is_active - If this is the currently active device.
 * @property {boolean} is_private_session - If this device is in a private session.
 * @property {boolean} is_restricted - Whether controlling this device is restricted.
 * @property {string} name - The name of the device.
 * @property {string} type - The type of device, e.g., "Computer", "Speaker".
 * @property {number} volume_percent - The current volume in percent.
 */
export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}
