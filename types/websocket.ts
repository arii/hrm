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

export const SpotifyCommandMessageSchema = z.object({
  type: z.literal('SPOTIFY_COMMAND'),
  command: SpotifyCommandSchema,
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

export interface InitialStateSnapshotPayload {
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

export type StateSnapshot = Omit<InitialStateSnapshotPayload, 'hrmData'>

export interface ActiveAlert {
  clientId: string
  code: 'HRM_STALE' | 'BAD_PLACEMENT'
  message: string
  severity: 'warning' | 'error'
  timestamp: number
}

export type ServerMessage =
  | {
      type: 'INITIAL_STATE'
      payload: InitialStateSnapshotPayload
    }
  | { type: 'HRM_UPDATE'; payload: HrmData[] }
  | { type: 'TIMER_UPDATE'; payload: TimerData }
  | { type: 'SPOTIFY_UPDATE'; payload: SpotifyData }
  | { type: 'ACTIVE_ALERTS_UPDATE'; payload: ActiveAlert[] }
  | { type: 'SPOTIFY_SERVICE_INIT_UPDATE'; payload: boolean }
  | { type: 'PONG' }
  | { type: 'DEVICE_OFFLINE'; payload: { deviceId: string } }
  | SpotifyExecutionMessage
