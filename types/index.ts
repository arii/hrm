// This file is for component-specific prop types.
// All other types should be defined in their respective files.

import { TimerMode, TimerPhase } from './core'
import { HrData } from './heart-rate'

export interface HrTileProps extends HrData {
  name: string
  calories?: number
  isConnected?: boolean
  lastUpdated: number | null

  // NEW: Flag to trigger the visual diagnostic state
  isAlerting?: boolean
  // NEW: Message to display in the overlay when alerting
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
import { WorkoutItem } from './workout'

export type WorkoutData = WorkoutItem[]

export interface DashboardSectionLoadingSkeletonProps {
  width?: string
  height?: string
  shape?: 'rectangular' | 'circular'
  count?: number
  className?: string
}
