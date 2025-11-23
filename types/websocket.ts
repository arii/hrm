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

export type TimerMode = 'STOPWATCH' | 'TABATA'
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'
  | 'RUNNING'

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
export interface SpotifyData {
  trackName: string
  artist: string
  isPlaying: boolean
}

/**
 * The single, unified state object broadcast by the server to all clients.
 */
export interface UnifiedStateMessage {
  type: 'INITIAL_STATE' | 'STATE_UPDATE'
  hrmData: HrmData[]
  timerData: TimerData
  spotifyData: SpotifyData
  spotifyServiceInitialized?: boolean
}

/**
 * A specialized message for high-frequency heart rate data updates.
 */
export interface HrmUpdateMessage {
  type: 'HRM_UPDATE'
  payload: HrmData[]
}

/**
 * BroadcastData: a small, optional-shaped payload that services may send to
 * the socket broadcaster. This mirrors the ad-hoc interface previously found
 * inside the compiled `server.js` and centralizes it here for reuse.
 */
/**
 * BroadcastData is the shape sent by server services into the broadcaster.
 * Use the canonical UnifiedStateMessage where possible; here we expose a
 * lightweight alias so services can pass partial state updates.
 */
export type BroadcastData = Partial<UnifiedStateMessage>

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
  deviceId?: string // Optional: for TRANSFER_PLAYBACK command
  volume?: number // Optional: for SET_VOLUME command (0-100)
  playlistUri?: string // Optional: for PLAY command
  token?: string // Optional: for passing access token
}

/**
 * Union type for all possible messages the client can send to the server.
 */
export type ClientCommandMessage =
  | HrmInputMessage
  | TimerCommandMessage
  | TimerModeCommandMessage
  | SpotifyCommandMessage
  | TimerConfigMessage

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
  ]),
  deviceId: z.string().optional(), // Optional: for TRANSFER_PLAYBACK command
  volume: z.number().min(0).max(100).optional(), // Optional: for SET_VOLUME command (0-100)
  playlistUri: z.string().optional(), // Optional: for PLAY command
  token: z.string().optional(), // Optional: for passing access token
})

export const ClientCommandMessageSchema = z.union([
  HrmInputMessageSchema,
  TimerCommandMessageSchema,
  TimerModeCommandMessageSchema,
  SpotifyCommandMessageSchema,
  TimerConfigMessageSchema,
])
