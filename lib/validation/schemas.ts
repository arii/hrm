/**
 * @file This file contains the Zod schemas for data validation.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */

import { z } from '../zod'

// =================================================================
// Data Model Schemas
// =================================================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  notes: z.string(),
})

export const HeartRateDataPointSchema = z.object({
  id: z.string().uuid(),
  workoutSessionId: z.string().uuid(),
  timestamp: z.number(),
  heartRate: z.number(),
})

// =================================================================
// API Request Schemas
// =================================================================

// Example: Schema for creating a new user profile
export const CreateUserProfileSchema = UserProfileSchema.pick({
  username: true,
  email: true,
  firstName: true,
  lastName: true,
})

// Example: Schema for creating a new workout session
export const CreateWorkoutSessionSchema = WorkoutSessionSchema.pick({
  userId: true,
  startedAt: true,
  notes: true,
})

// Example: Schema for adding a new heart rate data point
export const CreateHeartRateDataPointSchema = HeartRateDataPointSchema.pick({
  workoutSessionId: true,
  timestamp: true,
  heartRate: true,
})

// =================================================================
// WebSocket Message Schemas
// =================================================================

export const HrmInputDataSchema = z.object({
  value: z.number().nullable(),
})

export const HrmInputMessageSchema = z.object({
  type: z.literal('HRM_INPUT'),
  data: HrmInputDataSchema,
})

export const HrmMetadataUpdateDataSchema = z.object({
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
})

export const HrmMetadataUpdateMessageSchema = z.object({
  type: z.literal('HRM_METADATA_UPDATE'),
  data: HrmMetadataUpdateDataSchema,
})

export const TimerCommandMessageSchema = z.object({
  type: z.literal('TIMER_COMMAND'),
  command: z.union([z.literal('START'), z.literal('PAUSE'), z.literal('STOP')]),
})

export const TimerModeCommandMessageSchema = z.object({
  type: z.literal('SET_MODE'),
  mode: z.union([z.literal('STOPWATCH'), z.literal('TABATA')]),
})

export const TimerConfigMessageSchema = z.object({
  type: z.literal('TIMER_CONFIG'),
  workDuration: z.number(),
  restDuration: z.number(),
})

export const SpotifyCommandMessageSchema = z.object({
  type: z.literal('SPOTIFY_COMMAND'),
  command: z.union([
    z.literal('PLAY'),
    z.literal('PAUSE'),
    z.literal('NEXT'),
    z.literal('PREVIOUS'),
    z.literal('TRANSFER_PLAYBACK'),
    z.literal('SET_VOLUME'),
    z.literal('GET_DEVICES'), // <--- ADDED
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  playlistUri: z.string().optional(),
  contextUri: z.string().optional(),
  uri: z.string().optional(),
})

export const GetStateMessageSchema = z.object({
  type: z.literal('GET_STATE'),
})

export const ClientRegistrationMessageSchema = z.object({
  type: z.literal('REGISTER_CLIENT'),
  role: z.union([z.literal('dashboard'), z.literal('controller')]),
})

export const PingMessageSchema = z.object({
  type: z.literal('PING'),
})

export const ClientCommandMessageSchema = z.discriminatedUnion('type', [
  HrmInputMessageSchema,
  HrmMetadataUpdateMessageSchema,
  TimerCommandMessageSchema,
  TimerModeCommandMessageSchema,
  SpotifyCommandMessageSchema,
  TimerConfigMessageSchema,
  GetStateMessageSchema,
  ClientRegistrationMessageSchema,
  PingMessageSchema, // Add PING schema to the union
])

// =================================================================
// Real-time Data Schemas
// =================================================================

export const HrmStreamDataSchema = z.object({
  clientId: z.string(),
  value: z.number(),
  maxHr: z.number(),
  name: z.string().optional(),
  age: z.number().optional(),
  calories: z.number(),
})

export const TimerModeSchema = z.enum(['STOPWATCH', 'TABATA'])
export const TimerPhaseSchema = z.enum([
  'IDLE',
  'PREPARE',
  'WORK',
  'REST',
  'COOLDOWN',
  'RUNNING',
])

export const TimerDataSchema = z.object({
  isRunning: z.boolean(),
  currentPhase: TimerPhaseSchema,
  timeRemaining: z.number(),
  timeElapsed: z.number(),
  caloriesBurned: z.number(),
  mode: TimerModeSchema,
  workDuration: z.number(),
  restDuration: z.number(),
  soundToPlay: z.enum(['WORK', 'REST', 'COUNTDOWN']).optional(),
  soundEventId: z.number(),
})

export const SpotifyDeviceSchema = z.object({
  id: z.string(),
  is_active: z.boolean(),
  is_private_session: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string(),
  type: z.string(),
  volume_percent: z.number(),
})

export const SpotifyPlaybackStateSchema = z.object({
  trackId: z.string().nullable(),
  trackName: z.string(),
  artist: z.string(),
  albumName: z.string(),
  albumArtUrl: z.string(),
  isPlaying: z.boolean(),
  devices: z.array(SpotifyDeviceSchema),
  volume: z.number(),
  isMuted: z.boolean(),
})

export const SpotifyPlaylistItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
})

export const SpotifyPlaylistSchema = z.object({
  name: z.string(),
  uri: z.string(),
})
export const MeasurementSystemSchema = z.enum(['IMPERIAL', 'METRIC'])
export const WorkoutItemSchema = z.object({
  category: z.string(),
  exercises: z.array(z.string()),
})
export const WorkoutDataSchema = z.array(WorkoutItemSchema)
export const SpotifyExecutionMessageSchema = z.object({
  type: z.literal('EXECUTE_SPOTIFY'),
  payload: SpotifyCommandMessageSchema,
})
export const WorkoutColumnItemSchema = z.object({ title: z.string(), details: z.string().optional() }
)
