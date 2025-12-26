// File: types/schemas.ts
/**
 * Centralized Zod schemas for runtime validation of data contracts,
 * especially for WebSocket messages, ensuring type safety between
 * the server and client.
 */
import { z } from 'zod'

// --- Core Data Schemas ---

export const HrmDataSchema = z.object({
  clientId: z.string(),
  name: z.string().optional(),
  value: z.number().nullable(),
  maxHr: z.number().optional(),
  age: z.number().optional(),
  calories: z.number().optional(),
  zone: z
    .enum(['FAT_BURN', 'CARDIO', 'PEAK', 'RESTING'])
    .optional()
    .nullable(),
  batteryLevel: z.number().optional(),
})

export const TimerDataSchema = z.object({
  mode: z.enum(['STOPWATCH', 'TABATA']),
  phase: z.enum(['PREPARE', 'WORK', 'REST', 'IDLE']),
  timeRemaining: z.number(),
  workDuration: z.number(),
  restDuration: z.number(),
  isRunning: z.boolean(),
})

export const SpotifyDataSchema = z.object({
  trackName: z.string().nullable().optional(),
  artistName: z.string().nullable().optional(),
  albumArtUrl: z.string().nullable().optional(),
  isPlaying: z.boolean(),
  durationMs: z.number().optional(),
  progressMs: z.number().optional(),
  isPodcast: z.boolean().optional(),
  albumName: z.string().optional(),
})

// --- Server-to-Client Message Schemas ---

export const InitialStateSnapshotPayloadSchema = z.object({
  hrmData: z.array(HrmDataSchema),
  timerData: TimerDataSchema,
  spotifyData: SpotifyDataSchema,
  spotifyServiceInitialized: z.boolean().optional(),
})

export const ActiveAlertSchema = z.object({
  clientId: z.string(),
  code: z.enum(['HRM_STALE', 'BAD_PLACEMENT']),
  message: z.string(),
  severity: z.enum(['warning', 'error']),
  timestamp: z.number(),
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
    z.literal('GET_DEVICES'),
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  playlistUri: z.string().optional(),
})

// Note: This is a client message type that can also be sent by the server.
export const SpotifyExecutionMessageSchema = z.object({
  type: z.literal('EXECUTE_SPOTIFY'),
  payload: SpotifyCommandMessageSchema,
})

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INITIAL_STATE'),
    payload: InitialStateSnapshotPayloadSchema,
  }),
  z.object({
    type: z.literal('HRM_UPDATE'),
    payload: z.array(HrmDataSchema),
  }),
  z.object({
    type: z.literal('TIMER_UPDATE'),
    payload: TimerDataSchema,
  }),
  z.object({
    type: z.literal('SPOTIFY_UPDATE'),
    payload: SpotifyDataSchema,
  }),
  z.object({
    type: z.literal('ACTIVE_ALERTS_UPDATE'),
    payload: z.array(ActiveAlertSchema),
  }),
  z.object({
    type: z.literal('SPOTIFY_SERVICE_INIT_UPDATE'),
    payload: z.boolean(),
  }),
  z.object({
    type: z.literal('PONG'),
  }),
  SpotifyExecutionMessageSchema,
])

// --- Client-to-Server Message Schemas ---

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
  PingMessageSchema,
])
