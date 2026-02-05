import { WebSocket } from 'ws'
import type {
  HrmStreamData as ServerHrmData,
  TimerData,
  SpotifyPlaybackState as SpotifyData,
  TimerMode,
} from './core'

export interface HrmData extends ServerHrmData {
  isConnected?: boolean
  lastUpdate?: number
}

export interface ExtWebSocket extends WebSocket {
  clientId: string
  isAlive: boolean
  clientType?: 'dashboard' | 'controller'
}

export type { TimerData, SpotifyData, TimerMode }

export type SpotifyCommand =
  | 'PLAY'
  | 'PAUSE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'
  | 'GET_DEVICES'

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

import { z } from 'zod'

export const IncomingHrmDataSchema = z.object({
  value: z.number().nullable(),
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
  calories: z.number().optional(),
})

export type IncomingHrmData = z.infer<typeof IncomingHrmDataSchema>

export const HrmInputMessageSchema = z.object({
  type: z.literal('HRM_INPUT'),
  data: IncomingHrmDataSchema,
})

export type HrmInputMessage = z.infer<typeof HrmInputMessageSchema>

export const HrmMetadataUpdateDataSchema = z.object({
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  gender: z.string().optional(),
})

export type HrmMetadataUpdateData = z.infer<typeof HrmMetadataUpdateDataSchema>

export const HrmMetadataUpdateMessageSchema = z.object({
  type: z.literal('HRM_METADATA_UPDATE'),
  data: HrmMetadataUpdateDataSchema,
})

export type HrmMetadataUpdateMessage = z.infer<
  typeof HrmMetadataUpdateMessageSchema
>

export const TimerCommandMessageSchema = z.object({
  type: z.literal('TIMER_COMMAND'),
  command: z.union([z.literal('START'), z.literal('PAUSE'), z.literal('STOP')]),
})

export type TimerCommandMessage = z.infer<typeof TimerCommandMessageSchema>

export const TimerModeCommandMessageSchema = z.object({
  type: z.literal('SET_MODE'),
  mode: z.union([z.literal('STOPWATCH'), z.literal('TABATA')]),
})

export type TimerModeCommandMessage = z.infer<
  typeof TimerModeCommandMessageSchema
>

export const TimerConfigMessageSchema = z.object({
  type: z.literal('TIMER_CONFIG'),
  workDuration: z.number(),
  restDuration: z.number(),
})

export type TimerConfigMessage = z.infer<typeof TimerConfigMessageSchema>

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
  uri: z.string().optional(),
  offset: z
    .object({
      position: z.number(),
    })
    .optional(),
})

export type SpotifyCommandMessage = z.infer<typeof SpotifyCommandMessageSchema>

export const GetStateMessageSchema = z.object({
  type: z.literal('GET_STATE'),
})

export type GetStateMessage = z.infer<typeof GetStateMessageSchema>

export const ClientRegistrationMessageSchema = z.object({
  type: z.literal('REGISTER_CLIENT'),
  role: z.union([z.literal('dashboard'), z.literal('controller')]),
})

export type ClientRegistrationMessage = z.infer<
  typeof ClientRegistrationMessageSchema
>

export const SpotifyExecutionMessageSchema = z.object({
  type: z.literal('EXECUTE_SPOTIFY'),
  payload: SpotifyCommandMessageSchema,
})

export type SpotifyExecutionMessage = z.infer<
  typeof SpotifyExecutionMessageSchema
>

export const PingMessageSchema = z.object({
  type: z.literal('PING'),
})

export type PingMessage = z.infer<typeof PingMessageSchema>

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

export type ClientCommandMessage = z.infer<typeof ClientCommandMessageSchema>
