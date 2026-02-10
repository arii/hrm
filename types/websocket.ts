import { WebSocket } from 'ws'
import { z } from 'zod'
import type {
  HrmStreamData as HrmData,
  TimerData,
  SpotifyPlaybackState as SpotifyData,
  TimerMode,
} from './core'

// --- Zod Schemas ---

export const IncomingHrmDataSchema = z.object({
  value: z.number().nullable(),
  calories: z.number().optional(),
})

export const HrmMetadataUpdateDataSchema = z.object({
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  gender: z.string().optional(),
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

export const SpotifyCommandSchema = z.union([
  z.literal('PLAY'),
  z.literal('PAUSE'),
  z.literal('NEXT'),
  z.literal('PREVIOUS'),
  z.literal('TRANSFER_PLAYBACK'),
  z.literal('SET_VOLUME'),
  z.literal('GET_DEVICES'),
])

export const SpotifyCommandParametersSchema = z.object({
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
  playlistUri: z.string().optional(),
  contextUri: z.string().optional(),
  uri: z.string().optional(),
  offset: z
    .object({
      position: z.number(),
    })
    .optional(),
})

export const SpotifyCommandMessageSchema =
  SpotifyCommandParametersSchema.extend({
    type: z.literal('SPOTIFY_COMMAND'),
    command: SpotifyCommandSchema,
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

export const HrmInputMessageSchema = z.object({
  type: z.literal('HRM_INPUT'),
  data: IncomingHrmDataSchema,
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

// --- Server Message Schemas ---

export const HrmStreamDataSchema = z.object({
  clientId: z.string(),
  value: z.number(),
  maxHr: z.number(),
  name: z.string().optional(),
  age: z.number().optional(),
  calories: z.number(),
  weightKg: z.number().optional(),
  updatedAt: z.number().optional(),
})

export const TimerPhaseSchema = z.enum([
  'IDLE',
  'PREPARE',
  'WORK',
  'REST',
  'COOLDOWN',
  'RUNNING',
])
export const TimerModeSchema = z.enum(['STOPWATCH', 'TABATA'])

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

export const ActiveAlertSchema = z.object({
  clientId: z.string(),
  code: z.enum(['HRM_STALE', 'BAD_PLACEMENT']),
  message: z.string(),
  severity: z.enum(['warning', 'error']),
  timestamp: z.number(),
})

export const InitialStateSnapshotPayloadSchema = z.object({
  hrmData: z.array(HrmStreamDataSchema),
  timerData: TimerDataSchema,
  spotifyData: SpotifyPlaybackStateSchema,
  spotifyServiceInitialized: z.boolean().optional(),
})

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INITIAL_STATE'),
    payload: InitialStateSnapshotPayloadSchema,
  }),
  z.object({
    type: z.literal('HRM_UPDATE'),
    payload: z.array(HrmStreamDataSchema),
  }),
  z.object({ type: z.literal('TIMER_UPDATE'), payload: TimerDataSchema }),
  z.object({
    type: z.literal('SPOTIFY_UPDATE'),
    payload: SpotifyPlaybackStateSchema,
  }),
  z.object({
    type: z.literal('ACTIVE_ALERTS_UPDATE'),
    payload: z.array(ActiveAlertSchema),
  }),
  z.object({
    type: z.literal('SPOTIFY_SERVICE_INIT_UPDATE'),
    payload: z.boolean(),
  }),
  z.object({ type: z.literal('PONG') }),
  z.object({
    type: z.literal('DEVICE_OFFLINE'),
    payload: z.object({ deviceId: z.string() }),
  }),
  z.object({
    type: z.literal('EXECUTE_SPOTIFY'),
    payload: SpotifyCommandMessageSchema,
  }),
])

// --- WebSocket Connection & Augmentation ---

export interface ExtWebSocket extends WebSocket {
  clientId: string
  isAlive: boolean
  clientType?: 'dashboard' | 'controller'
}

// --- Server Broadcast State Interfaces ---

export type { HrmData, TimerData, SpotifyData, TimerMode }

// Derived Types
export type IncomingHrmData = z.infer<typeof IncomingHrmDataSchema>
export type HrmMetadataUpdateData = z.infer<typeof HrmMetadataUpdateDataSchema>
export type HrmMetadataUpdateMessage = z.infer<
  typeof HrmMetadataUpdateMessageSchema
>
export type TimerCommandMessage = z.infer<typeof TimerCommandMessageSchema>
export type TimerModeCommandMessage = z.infer<
  typeof TimerModeCommandMessageSchema
>
export type TimerConfigMessage = z.infer<typeof TimerConfigMessageSchema>
export type SpotifyCommand = z.infer<typeof SpotifyCommandSchema>
export type SpotifyCommandParameters = z.infer<
  typeof SpotifyCommandParametersSchema
>
export type SpotifyCommandMessage = z.infer<typeof SpotifyCommandMessageSchema>
export type GetStateMessage = z.infer<typeof GetStateMessageSchema>
export type ClientRegistrationMessage = z.infer<
  typeof ClientRegistrationMessageSchema
>
export type PingMessage = z.infer<typeof PingMessageSchema>
export type HrmInputMessage = z.infer<typeof HrmInputMessageSchema>
export type ClientCommandMessage = z.infer<typeof ClientCommandMessageSchema>

export interface SpotifyExecutionMessage {
  type: 'EXECUTE_SPOTIFY'
  payload: SpotifyCommandMessage
}

export type InitialStateSnapshotPayload = z.infer<
  typeof InitialStateSnapshotPayloadSchema
>

export type StateSnapshot = Omit<InitialStateSnapshotPayload, 'hrmData'>

export type ActiveAlert = z.infer<typeof ActiveAlertSchema>

export type ServerMessage = z.infer<typeof ServerMessageSchema>
