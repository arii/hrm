// This file is for component-specific prop types.
// All other types should be defined in their respective files.

import { HrmData } from './websocket'

export interface EnhancedHrmDataForTile extends HrmData {
  isAlerting: boolean
  alertMessage?: string
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
