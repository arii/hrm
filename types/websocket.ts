// File: types/websocket.ts (Shared TypeScript Data Contracts)
/**
 * Defines the strict interfaces for all data passed between the server services
 * and the client hooks via the WebSocket connection.
 */
import { z } from 'zod'
import { TimerMode, TimerPhase } from './shared'

// --- Server Broadcast State Interfaces ---

export interface HrmMetric {
  clientId: string
  value: number // Current BPM
  percentMax: number // 0-100
  connected: boolean
}

export interface TimerData {
  isRunning: boolean
  currentPhase: TimerPhase
  timeRemaining: number // Used for countdowns (Tabata, Prepare)
  timeElapsed: number // Used for count-ups (Stopwatch)
  mode: TimerMode
  workDuration: number // seconds for Tabata work interval
  restDuration: number // seconds for Tabata rest interval
  soundToPlay?: 'WORK' | 'REST' | 'COUNTDOWN'
  soundEventId: number // increments whenever soundToPlay represents a fresh cue
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

/**
 * The payload for the INITIAL_STATE message, representing the full application state.
 */
export interface InitialStateSnapshotPayload {
  hrmMetrics: HrmMetric[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

/**
 * The single, unified state object broadcast by the server to all clients.
 */
export interface UnifiedStateMessage {
  type: 'STATE_UPDATE'
  hrmMetrics: HrmMetric[] // CHANGED: array of metrics, not full profiles
  timerData: {
    currentPhase: TimerPhase
    timeRemaining: number
    timeElapsed: number
  }
  spotifyData: SpotifyData
}

// TOPIC-BASED REAL-TIME MESSAGES
// Use a discriminated union for type-safe message handling
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
  | UnifiedStateMessage
  | { type: 'ACTIVE_ALERTS_UPDATE'; payload: ActiveAlert[] }
  | { type: 'SPOTIFY_SERVICE_INIT_UPDATE'; payload: boolean }
  | SpotifyExecutionMessage

// --- Client Input Command Interfaces ---

export interface HrmInputData {
  value: number | null
}

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

/**
 * Union type for all possible messages the client can send to the server.
 */
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

// --- Zod Schemas for Client Input Command Interfaces ---

export const HrmInputDataSchema = z.object({
  value: z.number().nullable(),
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
