// This file is for component-specific prop types.
// All other types should be defined in their respective files.

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  background: string // hex color

  // NEW: Flag to trigger the visual diagnostic state
  isAlerting: boolean
  // NEW: Message to display in the overlay when alerting
  alertMessage?: string
}

export interface HeartRateZonesProps {
  maxHr: number
}

import { TimerMode, TimerPhase } from './shared'

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
