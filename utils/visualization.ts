// File: utils/visualization.ts
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { TimerData } from '@/types/websocket'
import { WorkoutData } from '@/types/index'
import { WorkoutItem } from '@/types/workout'
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'
import {
  calculateHeartRateZone,
  HR_ZONE_CONFIG,
  HeartRateZone,
} from '@/lib/shared/hr-zones'

// Define types for MUI color props
type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

export interface HrZoneProps {
  zone: HeartRateZone
  percentage: number
  color: string // Legacy: Hex color or Tailwind class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
  textColor: string
  bpm: number
}

/**
 * Calculates the current zone, percentage of max HR, and returns MUI-ready props.
 * Leveraging the centralized HR_ZONE_CONFIG for consistency.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  // 1. Get the core HR data from the shared module
  const { zoneName, percentage, bpm } = calculateHeartRateZone(currentHr, maxHr)

  // 2. Look up the UI properties from the centralized config
  const zoneConfig = HR_ZONE_CONFIG[zoneName]

  // 3. Combine domain data with UI properties
  return {
    zone: zoneName,
    percentage: percentage,
    color: zoneConfig.color,
    progressColor: zoneConfig.color,
    backgroundColor: zoneConfig.color,
    textColor: zoneConfig.textColor,
    bpm: bpm,
  }
}

interface TimerProps {
  text: string
  color: MuiColor
  backgroundColor: string // Tailwind bg class
  progressColor: string // Hex color
}

/**
 * Returns props (color, text) for the Tabata Timer phase display.
 */
export const getTimerProps = (
  currentPhase: TimerData['currentPhase']
): TimerProps => {
  switch (currentPhase) {
    case 'PREPARE':
      return {
        text: 'GET READY',
        color: 'warning', // MUI color for yellow/warning
        backgroundColor: 'bg-yellow-500/10',
        progressColor: '#f59e0b',
      }
    case 'WORK':
      return {
        text: 'WORK',
        color: 'error', // MUI color for red
        backgroundColor: 'bg-red-500/10',
        progressColor: '#ef4444',
      }
    case 'REST':
      return {
        text: 'REST',
        color: 'success', // MUI color for green
        backgroundColor: 'bg-green-500/10',
        progressColor: '#22c55e',
      }
    case 'RUNNING':
      return {
        text: 'RUNNING',
        color: 'primary', // MUI color for blue/primary
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#2563eb',
      }
    case 'COOLDOWN':
      return {
        text: 'COOLDOWN',
        color: 'info', // MUI color for blue/info
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#3b82f6',
      }
    case 'IDLE':
    default:
      return {
        text: 'READY',
        color: 'secondary', // MUI color for gray/secondary
        backgroundColor: 'bg-gray-200',
        progressColor: '#6b7280',
      }
  }
}

export const transformWorkoutDataToColumns = (
  data: WorkoutData
): WorkoutColumnsProps['columns'] => {
  if (!data) return []

  return data.map((category: WorkoutItem) => ({
    title: category.category,
    items: category.exercises.map((ex: string) => ({
      title: ex,
    })),
  }))
}
