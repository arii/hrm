/**
 * @file This file contains the centralized, canonical data structures for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */

import { z } from 'zod'
import { UserProfileSchema } from '../lib/validation/schemas'

// =================================================================================================
// User and Profile
// =================================================================================================

/**
 * Represents a user's profile information.
 * This type is automatically derived from the `UserProfileSchema` using Zod's `infer` utility.
 * This ensures that the TypeScript type always matches the runtime validation schema.
 *
 * @see /lib/validation/schemas.ts
 */
export type UserProfile = z.infer<typeof UserProfileSchema>

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
export interface HrmStreamData {
  clientId: string
  value: number
  maxHr: number
  name?: string
  age?: number
  calories: number
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