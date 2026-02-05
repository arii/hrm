import { WebSocket } from 'ws'
import type {
  HrmStreamData as HrmData,
  TimerData,
  SpotifyPlaybackState as SpotifyData,
  TimerMode,
} from './core'
import { z } from 'zod'

export interface ExtWebSocket extends WebSocket {
  clientId: string
  isAlive: boolean
  clientType?: 'dashboard' | 'controller'
}

export type { HrmData, TimerData, SpotifyData, TimerMode }

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

export interface IncomingHrmData {
  value: number | null
  maxHr?: number
  name?: string
  age?: number
  calories?: number
}

export interface HrmInputMessage {
  type: 'HRM_INPUT'
  data: IncomingHrmData
}

export type HrmMetadataUpdateData = Omit<
  Partial<HrmData>,
  'clientId' | 'value' | 'calories'
> & {
  weight?: number
  height?: number
  gender?: string
}

export interface HrmMetadataUpdateMessage {
  type: 'HRM_METADATA_UPDATE'
  data: HrmMetadataUpdateData
}

export interface TimerCommandMessage {
  type: 'TIMER_COMMAND'
  command: 'START' | 'PAUSE' | 'STOP'
}

export interface TimerModeCommandMessage {
  type: 'SET_MODE'
  mode: TimerMode
}

export interface TimerConfigMessage {
  type: 'TIMER_CONFIG'
  workDuration: number
  restDuration: number
}

export interface SpotifyCommandMessage {
  type: 'SPOTIFY_COMMAND'
  command: SpotifyCommand
  deviceId?: string
  volume?: number
  playlistUri?: string
  contextUri?: string
  uri?: string
  offset?: {
    position: number
  }
}

export interface GetStateMessage {
  type: 'GET_STATE'
}

export interface ClientRegistrationMessage {
  type: 'REGISTER_CLIENT'
  role: 'dashboard' | 'controller'
}

export interface SpotifyExecutionMessage {
  type: 'EXECUTE_SPOTIFY'
  payload: SpotifyCommandMessage
}

export interface PingMessage {
  type: 'PING'
}

export type ClientCommandMessage =
  | HrmInputMessage
  | HrmMetadataUpdateMessage
  | TimerCommandMessage
  | TimerModeCommandMessage
  | SpotifyCommandMessage
  | TimerConfigMessage
  | GetStateMessage
  | ClientRegistrationMessage
  | PingMessage

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
