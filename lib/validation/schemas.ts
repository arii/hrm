/**
 * @file This file contains the Zod schemas for data validation.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 */

import { z } from 'zod'

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
// WebSocket Message Schemas (Refactored for consistency)
// =================================================================

// Payloads are defined first
export const HrmInputPayloadSchema = z.object({
  value: z.number().nullable(),
  age: z.number().optional(),
  weight: z.number().optional(),
  gender: z.enum(['male', 'female']).optional(),
})
export type HrmInputPayload = z.infer<typeof HrmInputPayloadSchema>

export const HrmMetadataPayloadSchema = z.object({
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
})
export type HrmMetadataPayload = z.infer<typeof HrmMetadataPayloadSchema>

export const TimerCommandPayloadSchema = z.object({
  command: z.union([z.literal('START'), z.literal('PAUSE'), z.literal('STOP')]),
})
export type TimerCommandPayload = z.infer<typeof TimerCommandPayloadSchema>

export const SetModePayloadSchema = z.object({
  mode: z.union([z.literal('STOPWATCH'), z.literal('TABATA')]),
})
export type SetModePayload = z.infer<typeof SetModePayloadSchema>

export const TimerConfigPayloadSchema = z.object({
  workDuration: z.number(),
  restDuration: z.number(),
})
export type TimerConfigPayload = z.infer<typeof TimerConfigPayloadSchema>

export const SpotifyCommandPayloadSchema = z.object({
  command: z.union([
    z.literal('PLAY'),
    z.literal('PAUSE'),
    z.literal('NEXT'),
    z.literal('PREVIOUS'),
    z.literal('TRANSFER_PLAYBACK'),
    z.literal('SET_VOLUME'),
    z.literal('GET_DEVICES'),
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  playlistUri: z.string().optional(),
  contextUri: z.string().optional(),
  uri: z.string().optional(),
})
export type SpotifyCommandPayload = z.infer<typeof SpotifyCommandPayloadSchema>

export const RegisterClientPayloadSchema = z.object({
  role: z.union([z.literal('dashboard'), z.literal('controller')]),
})
export type RegisterClientPayload = z.infer<
  typeof RegisterClientPayloadSchema
>

// Base message structure
const createMessageSchema = <T extends string, P extends z.ZodTypeAny>(
  type: T,
  payloadSchema: P
) =>
  z.object({
    type: z.literal(type),
    payload: payloadSchema,
  })

// Message schemas using the new structure
export const HrmInputMessageSchema = createMessageSchema(
  'HRM_INPUT',
  HrmInputPayloadSchema
)
export type HrmInputMessage = z.infer<typeof HrmInputMessageSchema>

export const HrmMetadataMessageSchema = createMessageSchema(
  'HRM_METADATA_UPDATE',
  HrmMetadataPayloadSchema
)
export type HrmMetadataMessage = z.infer<typeof HrmMetadataMessageSchema>

export const TimerCommandMessageSchema = createMessageSchema(
  'TIMER_COMMAND',
  TimerCommandPayloadSchema
)
export type TimerCommandMessage = z.infer<typeof TimerCommandMessageSchema>

export const SetModeMessageSchema = createMessageSchema(
  'SET_MODE',
  SetModePayloadSchema
)
export type SetModeMessage = z.infer<typeof SetModeMessageSchema>

export const TimerConfigMessageSchema = createMessageSchema(
  'TIMER_CONFIG',
  TimerConfigPayloadSchema
)
export type TimerConfigMessage = z.infer<typeof TimerConfigMessageSchema>

export const SpotifyCommandMessageSchema = createMessageSchema(
  'SPOTIFY_COMMAND',
  SpotifyCommandPayloadSchema
)
export type SpotifyCommandMessage = z.infer<typeof SpotifyCommandMessageSchema>

export const RegisterClientMessageSchema = createMessageSchema(
  'REGISTER_CLIENT',
  RegisterClientPayloadSchema
)
export type RegisterClientMessage = z.infer<typeof RegisterClientMessageSchema>

export const GetStateMessageSchema = createMessageSchema(
  'GET_STATE',
  z.null().optional()
)
export type GetStateMessage = z.infer<typeof GetStateMessageSchema>

export const PingMessageSchema = createMessageSchema('PING', z.null().optional())
export type PingMessage = z.infer<typeof PingMessageSchema>

export const ClientCommandMessageSchema = z.discriminatedUnion('type', [
  HrmInputMessageSchema,
  HrmMetadataMessageSchema,
  TimerCommandMessageSchema,
  SetModeMessageSchema,
  SpotifyCommandMessageSchema,
  TimerConfigMessageSchema,
  GetStateMessageSchema,
  RegisterClientMessageSchema,
  PingMessageSchema,
])
export type ClientCommandMessage = z.infer<typeof ClientCommandMessageSchema>

// =================================================================
// Real-time Data Schemas
// =================================================================

export const HrmStreamDataSchema = z.object({
  clientId: z.string(),
  value: z.number(),
  maxHr: z.number(),
  name: z.string().optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  gender: z.enum(['male', 'female']).optional(),
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
  id: z.string().nullable(),
  is_active: z.boolean(),
  is_private_session: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string(),
  type: z.string(),
  volume_percent: z.number().nullable(),
  supports_volume: z.boolean(),
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
  durationMs: z.number().optional(),
  progressMs: z.number().optional(),
  targetDeviceId: z.string().optional().nullable(),
})

export const SpotifyPlaylistItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
})

export const SpotifyPlaylistSchema = z.object({
  name: z.string(),
  uri: z.string(),
  id: z.string(),
  imageUrl: z.string().optional(),
  owner: z.string().optional(),
  description: z.string().optional(),
})

export const MeasurementSystemSchema = z.enum(['METRIC', 'IMPERIAL'])

export const HeartRateZoneSchema = z.enum([
  'PEAK',
  'CARDIO',
  'FAT_BURN',
  'WARM_UP',
  'REST',
])

export const WorkoutItemSchema = z.object({
  category: z.string(),
  exercises: z.array(z.string()),
})

export const WorkoutDataSchema = z.array(WorkoutItemSchema)

export const WorkoutColumnItemSchema = z.object({
  title: z.string(),
  details: z.string().optional(),
})

export const GenderSchema = z.enum(['male', 'female'])
