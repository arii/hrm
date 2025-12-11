// File: types/shared.ts
/**
 * Single Source of Truth (SSOT) for data structures shared between the
 * server, client, and WebSocket protocols.
 */

// --- Timer Service Types ---

export type TimerMode = 'STOPWATCH' | 'TABATA'
export type TimerPhase =
  | 'IDLE'
  | 'PREPARE'
  | 'WORK'
  | 'REST'
  | 'COOLDOWN'
  | 'RUNNING'

// --- Heart Rate Monitor (HRM) Types ---

/**
 * Static, unchanging metadata associated with a heart rate monitor client.
 * This data is sent once on initial page load and is NOT part of the
 * high-frequency WebSocket updates.
 */
export interface HrmStaticMetadata {
  clientId: string
  maxHr: number
  name?: string
  age?: number
}

/**
 * The lightweight, high-frequency metrics payload for HRM updates.
 * This is the ONLY HRM-related data sent over the WebSocket after the
 * initial state is established.
 */
export interface HrmMetric {
  clientId: string
  value: number
}
