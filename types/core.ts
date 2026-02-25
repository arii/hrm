/**
 * @file This file contains the centralized, canonical data structures for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */
import { HeartRateZone } from '@/lib/shared/hr-zones'

// =================================================================================================
// User and Profile
// =================================================================================================

export type MeasurementSystem = 'IMPERIAL' | 'METRIC'
export type Gender = 'MALE' | 'FEMALE' | 'NEUTRAL'

/**
 * Represents a user's identity and authentication profile.
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

/**
 * Represents a user's physical attributes for health calculations.
 */
export interface UserPhysicalProfile {
  userId: string
  age: number
  weight: number // Stored normalized in KG
  gender: Gender
  unitSystem: MeasurementSystem
  maxHr?: number // Optional override, otherwise calculated
}

// =================================================================================================
// Workout and Fitness
// =================================================================================================

/**
 * Defines the set of valid commands that can be sent to the Spotify service.
 */
export type SpotifyCommand =
  | 'PLAY'
  | 'PAUSE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'SET_VOLUME'
  | 'TRANSFER_PLAYBACK'
  | 'GET_DEVICES'
  | 'LOGIN'

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
 * Represents aggregated session statistics for heart rate data.
 */
export interface HrmSessionStats {
  avgHr: number
  peakHr: number
  minHr: number
}

/**
 * Internal counters used for incremental statistics calculation.
 */
export interface HrmInternalStats {
  count: number
  sumHr: number
  peakHr: number
  minHr: number
}

/**
 * Represents raw heart rate data streamed from a client.
 */
export interface RawHrmStreamData {
  clientId: string
  value: number
  maxHr: number
  name?: string
  age?: number
  calories: number
  percentage?: number
  zone?: HeartRateZone
  weightKg?: number
  updatedAt?: number
}

/**
 * Represents heart rate data augmented with session-level statistics.
 */
export interface HrmStreamData extends RawHrmStreamData {
  // Session statistics (calculated incrementally)
  sessionStats?: HrmSessionStats
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
 * Consolidates all playback-related information into a single source of truth.
 */
export interface SpotifyPlaybackState {
  devices: SpotifyDevice[]
  playback: {
    track: {
      id: string | null
      name: string
      artist: string
      albumName: string
      albumArtUrl: string
    }
    is_playing: boolean
    volume_percent: number
    isMuted: boolean
    progress_ms: number
  }
}

/**
 * Represents a single item (track) in a Spotify playlist.
 */
export interface SpotifyPlaylistItem {
  id: string
  name: string
  uri: string
  duration_ms: number
  artists: { name: string }[] | string
  album: {
    name: string
    images: { url: string; height: number; width: number }[]
  }
}

/**
 * Defines the parameters that can be passed to the Spotify service's handleCommand method.
 */
export interface SpotifyCommandParameters {
  deviceId?: string
  volume?: number
  playlistUri?: string
  contextUri?: string
  uri?: string
}

/**
 * Represents a Spotify playlist.
 */
export interface SpotifyPlaylist {
  id?: string
  name: string
  uri: string
  description?: string | null
  imageUrl?: string | null
  trackCount?: number
  owner?: string
  public?: boolean
  isPreset?: boolean
  isSearchResult?: boolean
}

/**
 * Represents the response from the Spotify token endpoint.
 */
export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token?: string
}
