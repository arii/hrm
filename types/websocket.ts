/**
 * @file This file centralizes all WebSocket-related type definitions, deriving them from the Zod schemas
 * to ensure a single source of truth. It exports the core message types and state snapshots used
 * across the client and server.
 *
 * @see /docs/decisions/0002-api-validation-with-zod.md
 * @see /lib/validation/schemas.ts
 */
import { WebSocket } from 'ws'
import { z } from 'zod'

import {
  HrmStreamDataSchema,
  SpotifyDeviceSchema,
  SpotifyPlaybackStateSchema,
  TimerDataSchema,
  TimerModeSchema,
} from '../lib/validation/schemas'

// Re-exporting inferred types from Zod schemas
export type {
  ClientCommandMessage,
  HrmInputMessage,
  HrmMetadataMessage,
  TimerCommandMessage,
  SetModeMessage,
  TimerConfigMessage,
  SpotifyCommandMessage,
  RegisterClientMessage,
  GetStateMessage,
  PingMessage,
} from '../lib/validation/schemas'

export type HrmStreamData = z.infer<typeof HrmStreamDataSchema>
export type SpotifyDevice = z.infer<typeof SpotifyDeviceSchema>
export type SpotifyPlaybackState = z.infer<typeof SpotifyPlaybackStateSchema>
export type TimerData = z.infer<typeof TimerDataSchema>
export type TimerMode = z.infer<typeof TimerModeSchema>

// =================================================================
// Server-Side Types
// =================================================================

/**
 * Extends the base WebSocket type with additional properties for server-side state management.
 */
export interface ExtWebSocket extends WebSocket {
  isAlive: boolean
  clientType?: 'dashboard' | 'controller'
  clientId: string
}

/**
 * Defines the shape of the full application state snapshot.
 * This is sent to clients on initial connection and can be requested.
 */
export interface StateSnapshot {
  timer: TimerData
  spotify: SpotifyPlaybackState
}

// =================================================================
// Server-to-Client Message Schemas
// =================================================================

/**
 * Represents the initial state sent to a client upon connection.
 */
export interface InitialStateSnapshotPayload extends StateSnapshot {
  hrmData: HrmStreamData[]
}

/**
 * Defines all possible messages the server can send to a client.
 * This is a discriminated union based on the `type` property.
 */
export type ServerMessage =
  | { type: 'INITIAL_STATE'; payload: InitialStateSnapshotPayload }
  | { type: 'HRM_UPDATE'; payload: HrmStreamData[] }
  | { type: 'TIMER_UPDATE'; payload: Partial<TimerData> }
  | { type: 'SPOTIFY_UPDATE'; payload: Partial<SpotifyPlaybackState> }
  | { type: 'ACTIVE_ALERTS_UPDATE'; payload: string[] }
  | {
      type: 'EXECUTE_SPOTIFY'
      payload: z.infer<
        typeof import('../lib/validation/schemas').SpotifyCommandPayloadSchema
      >
    }
  | { type: 'SPOTIFY_SERVICE_INIT_UPDATE'; payload: boolean }
  | { type: 'PONG' }
