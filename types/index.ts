// This file is for component-specific prop types.
// All other types should be defined in their respective files.

import { TimerMode, TimerPhase } from './core'
import { HrmData } from '@/types/websocket'

export interface HrTileProps {
  name: string
  bpm: number | null
  percentMax: number // 0-100
  calories: number
  isConnected: boolean
  isAlerting?: boolean
  alertMessage?: string
}

export interface TimerDisplayProps {
  phase: TimerPhase
  timeRemaining: number
  workDuration: number
  restDuration: number
  totalDuration: number
}

export interface TimerControlsProps {
  phase: TimerPhase
  mode: TimerMode
  setMode: (mode: TimerMode) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
  isWebSocketConnected: boolean
}

export interface WorkoutAnalysisProps {
  workoutRecords: { time: number; hr: number }[]
  userAge: number | null
  userWeight: number | null
  gender: 'MALE' | 'FEMALE' | null
  totalDuration: number
}

export interface EnhancedHrmDataForTile extends HrmData {
  isAlerting: boolean
  alertMessage?: string
  isActive?: boolean
}

// NOTE: We are intentionally not using the UserSettings from the context here,
// as the context itself handles persistence. This type is for component props
// where only the settings values are needed.
export type UserSettings = {
  userName: string | null
  userAge: number | null
  userWeight: number | null
  gender: 'MALE' | 'FEMALE' | null
  restingHr: number | null
  maxHr: number | null
  deviceId: string | null
}
