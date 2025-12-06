// This file is for component-specific prop types.
// All other types should be defined in their respective files.

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  background: string // hex color
}

export interface HeartRateZonesProps {
  maxHr: number
}

export interface UserSettings {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string | null
  userAge?: number
  restingHr?: number
  maxHr?: number
  deviceId?: string
}

import { TimerMode, TimerPhase } from './websocket'

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  cycle: number
  totalCycles: number
  mode: TimerMode
  workDuration?: number
  restDuration?: number
}

export interface WorkoutItem {
  title: string
  details?: string
}

export interface WorkoutColumnsProps {
  columns: Array<{ title: string; items: WorkoutItem[] }>
}

export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

export interface SpotifyPlaylist {
  name: string
  uri: string
}
