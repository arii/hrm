/**
 * @file This file contains the centralized, canonical data structures for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */

// =================================================================================================
// User and Profile
// =================================================================================================

/**
 * Represents a user's profile information.
 *
 * @property {string} id - The unique identifier for the user (UUID).
 * @property {string} username - The user's chosen username. Must be unique.
 * @property {string} email - The user's email address. Must be unique.
 * @property {string | null} firstName - The user's first name.
 * @property {string | null} lastName - The user's last name.
 * @property {string} createdAt - The timestamp when the user was created (ISO 8601).
 * @property {string} updatedAt - The timestamp when the user was last updated (ISO 8601).
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

// =================================================================================================
// Workout and Fitness
// =================================================================================================

/**
 * Represents a single workout session.
 *
 * @property {string} id - The unique identifier for the workout session (UUID).
 * @property {string} userId - The ID of the user who performed the workout.
 * @property {string} startedAt - The timestamp when the workout started (ISO 8601).
 * @property {string | null} endedAt - The timestamp when the workout ended (ISO 8601).
 * @property {string} notes - Any notes the user added for the workout.
 */
export interface WorkoutSession {
  id: string
  userId: string
  startedAt: string
  endedAt: string | null
  notes: string
}

/**
 * Represents a single heart rate data point.
 *
 * @property {string} id - The unique identifier for the data point (UUID).
 * @property {string} workoutSessionId - The ID of the workout session this data point belongs to.
 * @property {number} timestamp - The Unix epoch milliseconds when the heart rate was measured.
 * @property {number} heartRate - The heart rate in beats per minute.
 */
export interface HeartRateDataPoint {
  id: string
  workoutSessionId: string
  timestamp: number
  heartRate: number
}

// =================================================================================================
// Real-time Data and WebSocket Payloads
// =================================================================================================

/**
 * Represents a single, real-time heart rate data stream from a client.
 */
export interface HrmData {
  clientId: string
  name: string
  value: number
  maxHr: number
  age?: number
  totalCalories?: number
  weightKg?: number
  isConnected: boolean
}

/**
 * Defines the possible modes for the application timer.
 */
export type TimerMode = 'STOPWATCH' | 'TABATA'

/**
 * Defines the possible phases of the application timer.
 */
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'
  | 'RUNNING'

/**
 * Represents the complete state of the application timer.
 */
export interface TimerData {
  isRunning: boolean
  currentPhase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  caloriesBurned: number
  mode: TimerMode
  workDuration: number
  restDuration: number
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number
}

// =================================================================================================
// Spotify Integration
// =================================================================================================

/**
 * Represents a single device available for Spotify playback.
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

/**
 * Represents the current playback state of Spotify.
 */
export interface SpotifyPlaybackState {
  trackId: string | null
  trackName: string
  artist: string
  albumName: string
  albumArtUrl: string
  isPlaying: boolean
  devices: SpotifyDevice[]
  volume: number
  isMuted: boolean
}

/**
 * Represents a single item in a Spotify playlist.
 */
export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
}

/**
 * Represents a Spotify playlist.
 */
export interface SpotifyPlaylist {
  name: string
  uri: string
}
