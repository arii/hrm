/**
 * @file This file contains the centralized, canonical data structures for the application.
 *
 * @see /docs/decisions/0001-centralized-data-models.md
 */
import { z } from '../lib/zod'
import {
  UserProfileSchema,
  WorkoutSessionSchema,
  HeartRateDataPointSchema,
  HrmStreamDataSchema,
  TimerModeSchema,
  TimerPhaseSchema,
  TimerDataSchema,
  SpotifyDeviceSchema,
  SpotifyPlaybackStateSchema,
  SpotifyPlaylistItemSchema,
  SpotifyPlaylistSchema,
} from '../lib/validation/schemas'

// =================================================================================================
// User and Profile
// =================================================================================================

export type UserProfile = z.infer<typeof UserProfileSchema>

// =================================================================================================
// Workout and Fitness
// =================================================================================================

export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>
export type HeartRateDataPoint = z.infer<typeof HeartRateDataPointSchema>

// =================================================================================================
// Real-time Data and WebSocket Payloads
// =================================================================================================

export type HrmStreamData = z.infer<typeof HrmStreamDataSchema>
export type TimerMode = z.infer<typeof TimerModeSchema>
export type TimerPhase = z.infer<typeof TimerPhaseSchema>
export type TimerData = z.infer<typeof TimerDataSchema>

// =================================================================================================
// Spotify Integration
// =================================================================================================

export type SpotifyDevice = z.infer<typeof SpotifyDeviceSchema>
export type SpotifyPlaybackState = z.infer<typeof SpotifyPlaybackStateSchema>
export type SpotifyPlaylistItem = z.infer<typeof SpotifyPlaylistItemSchema>
export type SpotifyPlaylist = z.infer<typeof SpotifyPlaylistSchema>

export type MeasurementSystem = z.infer<typeof MeasurementSystemSchema>
export type WorkoutItem = z.infer<typeof WorkoutItemSchema>
export type WorkoutData = z.infer<typeof WorkoutDataSchema>
export type WorkoutColumnItem = z.infer<typeof WorkoutColumnItemSchema>;
