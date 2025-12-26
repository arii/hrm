// types/schemas.ts
import { z } from 'zod'

// --- Zod Schemas for Core Data Structures ---

const HrmDataSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  value: z.number().nullable(),
  timestamp: z.number(),
  maxHr: z.number(),
  age: z.number(),
  restingHr: z.number().optional(), // Make optional to match type
  calories: z.number(),
})

const TimerDataSchema = z.object({
  phase: z.enum(['PREPARE', 'WORK', 'REST', 'IDLE', 'COOLDOWN', 'RUNNING']),
  currentPhase: z.enum([
    'IDLE',
    'PREPARE',
    'WORK',
    'REST',
    'COOLDOWN',
    'RUNNING',
  ]),
  timeRemaining: z.number(),
  timeElapsed: z.number(),
  totalTime: z.number(),
  workDuration: z.number(),
  restDuration: z.number(),
  mode: z.enum(['STOPWATCH', 'TABATA']),
  isRunning: z.boolean(),
  caloriesBurned: z.number(),
  soundEventId: z.number(),
  soundToPlay: z.enum(['WORK', 'REST', 'COUNTDOWN']).optional(),
})

// Simplified Spotify schema for client-side validation
const SpotifyDataSchema = z.object({
  isPlaying: z.boolean(),
  trackName: z.string().nullable(),
  artistName: z.string().nullable(),
  albumArtUrl: z.string().nullable(),
  durationMs: z.number().nullable(),
  progressMs: z.number().nullable(),
  trackId: z.string().nullable(),
  contextUri: z.string().nullable(),
  isPodcast: z.boolean().nullable(),
  loggedIn: z.boolean(),
  volumePercent: z.number().nullable(),
})

const InitialStateSnapshotPayloadSchema = z.object({
  hrmData: z.array(HrmDataSchema),
  timerData: TimerDataSchema,
  spotifyData: SpotifyDataSchema,
  spotifyServiceInitialized: z.boolean().optional(),
})

const ActiveAlertSchema = z.object({
  clientId: z.string(),
  code: z.enum(['HRM_STALE', 'BAD_PLACEMENT']),
  message: z.string(),
  severity: z.enum(['warning', 'error']),
  timestamp: z.number(),
})

// --- Zod Schema for Discriminated Union of Server Messages ---

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
    type: z.literal('EXECUTE_SPOTIFY'),
    payload: z.object({
      command: z.string(),
      args: z.array(z.any()).optional(),
    }),
  }),
  z.object({
    type: z.literal('PONG'),
  }),
])

// --- Zod Schemas for Client Input Command Interfaces ---

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
    z.literal('GET_DEVICES'),
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  playlistUri: z.string().optional(),
  contextUri: z.string().optional(),
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
