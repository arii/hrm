// This file is for component-specific prop types.
// All other types should be defined in their respective files.
import { HrmStreamData as ServerHrmData } from './core'
import { TimerMode, TimerPhase } from './core'

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

// Client-side extension of HrmData to include connection status
export interface HrmData extends ServerHrmData {
  isConnected: boolean
}

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
