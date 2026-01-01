// This file is for component-specific prop types.
// All other types should be defined in their respective files.

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  calories?: number
  isConnected?: boolean

  // NEW: Flag to trigger the visual diagnostic state
  isAlerting?: boolean
  // NEW: Message to display in the overlay when alerting
  alertMessage?: string
}

import { TimerMode, TimerPhase } from './core'
import { WebSocketLogEvent } from './websocket'

export interface HeartRateZonesProps {
  maxHr: number
}

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number
  timeElapsed: number
  cycle: number
  totalCycles: number
  mode: TimerMode
  workDuration?: number
  restDuration?: number
}

// Renamed to avoid conflict
export interface WorkoutColumnItem {
  title: string
  details?: string
}

export interface WorkoutColumnsProps {
  columns: Array<{ title: string; items: WorkoutColumnItem[] }>
}

// Correct WorkoutItem for the parser and WebSocket
export interface WorkoutItem {
  category: string
  exercises: string[]
}

export type WorkoutData = WorkoutItem[]

export interface DashboardSectionLoadingSkeletonProps {
  width?: string | number
  height?: string | number
  shape?: 'rectangular' | 'circular'
  count?: number
  className?: string
}

// User Profile & Measurement System
export type MeasurementSystem = 'IMPERIAL' | 'METRIC'
export type Gender = 'MALE' | 'FEMALE'

export interface UserProfile {
  name: string
  age: number
  weight: number // Stored normalized in KG
  gender: Gender
  unitSystem: MeasurementSystem
}

/**
 * @interface WebSocketLogMeta
 * @description Represents the metadata for a WebSocket log entry.
 * @property {string} clientId - The client's identifier.
 * @property {string} [ip] - The client's IP address.
 * @property {boolean} isSecure - Whether the connection is secure.
 * @property {string} [origin] - The origin of the request.
 * @property {string} [userAgent] - The client's user agent.
 * @property {string} host - The host of the request.
 */
export interface WebSocketLogMeta {
  clientId: string
  ip?: string
  isSecure: boolean
  origin?: string
  userAgent?: string
  host: string
  event: WebSocketLogEvent
}
