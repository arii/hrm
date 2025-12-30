/**
 * @file This file contains the core domain types for the application.
 * It serves as the single source of truth for data structures that are
 * shared across multiple domains (e.g., database, API, client-side).
 *
 * @see /docs/decisions/0001-domain-driven-design-and-type-colocation.md
 */

// =================================================================================================
// Measurement and Biometrics
// =================================================================================================

export type MeasurementSystem = 'IMPERIAL' | 'METRIC'
export type Gender = 'MALE' | 'FEMALE'

// =================================================================================================
// User and Profile
// =================================================================================================

/**
 * Represents a user's identity and authentication profile.
 * Source of truth for AuthN/AuthZ.
 */
export interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Represents a user's physical attributes for health calculations.
 * Source of truth for Calorie/Zone engines.
 */
export interface UserPhysicalProfile {
  userId: string
  age: number
  weight: number // Always stored normalized in KG for internal calc
  gender: Gender
  unitSystem: MeasurementSystem
  maxHr?: number // Optional override
}

// =================================================================================================
// Workout and Fitness
// =================================================================================================

/**
 * Represents a recorded workout session.
 */
export interface WorkoutSession {
  id: string
  userId: string
  startedAt: string
  endedAt: string | null
  notes: string
}

/**
 * Represents a single heart rate measurement at a specific point in time.
 */
export interface HeartRateDataPoint {
  id: string
  workoutSessionId: string
  timestamp: number
  heartRate: number
}

// =================================================================================================
// Real-time Data (from Server Services)
// =================================================================================================

/**
 * Represents the state of a single heart rate monitor stream, including
 * calculated metrics like calories burned.
 */
export interface HrmStreamData {
  clientId: string
  name: string
  value: number // The core BPM value
  maxHr: number
  age: number
  calories: number
  gender: Gender
}

/**
 * Represents the complete state of the Tabata Timer service.
 */
export interface TimerData {
  phase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  cycle: number
  totalCycles: number
  mode: TimerMode
  workDuration: number
  restDuration: number
  isRunning: boolean
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId?: number
}

/**
 * Represents the possible phases of the Tabata Timer.
 */
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COMPLETED'
  | 'PAUSED'
  | 'RUNNING'
  | 'COOLDOWN'

/**
 * Represents the operational modes of the timer.
 */
export type TimerMode = 'STOPWATCH' | 'TABATA'

/**
 * Represents the playback state from the Spotify Polling Service.
 * This is a subset of the full Spotify API PlaybackState object.
 */
export interface SpotifyPlaybackState {
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArtUrl: string | null
  durationMs: number | null
  progressMs: number | null
  volumePercent: number | null
  devices: SpotifyDevice[]
}

export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  uri: string
  tracks: SpotifyPlaylistItem[]
}

export interface SpotifyDevice {
  id: string | null
  name: string
  type: string
  volume: number
  is_active: boolean
}
