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

<<<<<<< HEAD
export interface UserSettings {
  userName: string
  userAge: number | null
  maxHr: number | null
  restingHr: number | null
  deviceId: string | null
=======
export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

export interface SpotifyPlaylist {
  name: string
  uri: string
>>>>>>> origin/leader
}
