// This file is for component-specific prop types.
// All other types should be defined in their respective files.

// Import shared domain types to avoid re-definition
import {
  TimerMode,
  TimerPhase,
  MeasurementSystem,
  Gender,
  UserPhysicalProfile,
} from './core'

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  calories?: number
  isConnected?: boolean
  isAlerting?: boolean
  alertMessage?: string
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

// Re-export specific types if components rely on them via this file
export type { MeasurementSystem, Gender, UserPhysicalProfile }
