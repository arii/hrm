// This file is for component-specific prop types.
// All other types should be defined in their respective files.

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  calories?: number
  isConnected?: boolean

  // NEW: Flag to trigger the visual diagnostic state
  isAlerting?: boolean
  // NEW: Message to display in the overlay when alerting
  alertMessage?: string
}

// Renamed to avoid conflict
export interface WorkoutColumnItem {
  title: string
  details?: string
}

// Correct WorkoutItem for the parser and WebSocket
export interface WorkoutItem {
  category: string
  exercises: string[]
}

export type WorkoutData = WorkoutItem[]

export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export interface SpotifyPlaylist {
  name: string
  uri: string
}

export interface DashboardSectionLoadingSkeletonProps {
  width?: string | number
  height?: string | number
  shape?: 'rectangular' | 'circular'
  count?: number
  className?: string
}
