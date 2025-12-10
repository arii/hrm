// File: types/websocket.ts (Shared TypeScript Data Contracts)
/**
 * Defines the strict interfaces for all data passed between the server services
 * and the client hooks via the WebSocket connection.
 */

// --- Server Broadcast State Interfaces ---

export interface HrmData {
  clientId: string
  value: number
  maxHr: number
  name?: string
  age?: number
}

export type TimerMode = 'STOPWATCH' | 'TABATA' | 'IDLE'
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'
  | 'RUNNING'
  | 'FINISHED'

export interface TabataConfig {
  workDuration: number
  restDuration: number
  totalCycles: number
}

export interface TimerData {
  isRunning: boolean
  currentPhase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  mode: TimerMode
  cycle: number
  totalCycles: number
}

export interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export interface SpotifyData {
  trackName: string
  artist: string
  isPlaying: boolean
  devices: SpotifyDevice[]
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

export type BroadcastMessage =
  | { type: 'HRM_UPDATE'; payload: HrmData[] }
  | { type: 'TIMER_UPDATE'; payload: TimerData }
  | { type: 'SPOTIFY_UPDATE'; payload: SpotifyData }
  | { type: 'ACTIVE_ALERTS_UPDATE'; payload: ActiveAlert[] }
  | { type: 'SPOTIFY_SERVICE_INIT_UPDATE'; payload: boolean }

export type ServerMessage =
  | {
      type: 'INITIAL_STATE'
      payload: InitialStateSnapshotPayload
    }
  | BroadcastMessage
  | SpotifyExecutionMessage

// --- Client Input Command Interfaces ---

export type HrmInputData = Omit<Partial<HrmData>, 'clientId'>

export interface HrmInputMessage {
  type: 'HRM_INPUT'
  data: HrmInputData
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
  command:
    | 'PLAY'
    | 'PAUSE'
    | 'NEXT'
    | 'PREVIOUS'
    | 'TRANSFER_PLAYBACK'
    | 'SET_VOLUME'
    | 'GET_DEVICES'
  deviceId?: string
  volume?: number
  playlistUri?: string
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

export type ClientCommandMessage =
  | HrmInputMessage
  | TimerCommandMessage
  | TimerModeCommandMessage
  | SpotifyCommandMessage
  | TimerConfigMessage
  | GetStateMessage
  | ClientRegistrationMessage

import { z } from 'zod'

// --- Zod Schemas for Client Input Command Interfaces ---

export const HrmInputDataSchema = z.object({
  value: z.number().nullable().optional(),
  maxHr: z.number().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
})

export const HrmInputMessageSchema = z.object({
  type: z.literal('HRM_INPUT'),
  data: HrmInputDataSchema,
})

export const TimerCommandMessageSchema = z.object({
  type: z.literal('TIMER_COMMAND'),
  command: z.union([z.literal('START'), z.literal('PAUSE'), z.literal('STOP')]),
})

export const TimerModeCommandMessageSchema = z.object({
  type: z.literal('SET_MODE'),
  mode: z.union([
    z.literal('STOPWATCH'),
    z.literal('TABATA'),
    z.literal('IDLE'),
  ]),
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
})

export const GetStateMessageSchema = z.object({
  type: z.literal('GET_STATE'),
})

export const ClientRegistrationMessageSchema = z.object({
  type: z.literal('REGISTER_CLIENT'),
  role: z.union([z.literal('dashboard'), z.literal('controller')]),
})

export const ClientCommandMessageSchema = z.union([
  HrmInputMessageSchema,
  TimerCommandMessageSchema,
  TimerModeCommandMessageSchema,
  SpotifyCommandMessageSchema,
  TimerConfigMessageSchema,
  GetStateMessageSchema,
  ClientRegistrationMessageSchema,
])
