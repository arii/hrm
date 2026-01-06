// This file is for component-specific prop types.
// All other types should be defined in their respective files.
import { HrmData } from './websocket'
import { TimerMode, TimerPhase } from './core'
export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  calories?: number
  isConnected?: boolean
  isDataStale?: boolean
  isAlerting?: boolean
  alertMessage?: string
}
export interface EnhancedHrmDataForTile extends HrmData {
  isAlerting: boolean
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
export interface WorkoutColumnItem {
  title: string
  details?: string
}
export interface WorkoutColumnsProps {
  columns: Array<{
    title: string
    items: WorkoutColumnItem[]
  }>
}
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
export interface WorkoutExportData {
  startTime: number // ms timestamp
  durationSeconds: number
  totalCalories: number
  records: Array<{
    time: number // ms timestamp
    hr: number
  }>
  userAge?: number
  userWeight?: number
  gender?: 'male' | 'female'
}
