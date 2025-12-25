// File: utils/visualization.ts
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 */
import { TimerData } from '../types/websocket'
import { WorkoutData, WorkoutItem } from '../types/index'
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'
import theme from '../lib/theme'

// Define types for MUI color props
type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

// UI properties for each heart rate zone
type HrZoneUi = {
  name: string
  color: string
  progressColor: string
  bgColor: string
}

export const HR_ZONE_UI_PROPS_MAP: Record<number, HrZoneUi> = {
  1: {
    name: 'Warm-up',
    color: 'text-blue-400',
    progressColor: theme.palette.secondary.main,
    bgColor: theme.palette.secondary.main,
  },
  2: {
    name: 'Fat Burn',
    color: 'text-green-500',
    progressColor: theme.palette.success.main,
    bgColor: theme.palette.success.main,
  },
  3: {
    name: 'Cardio',
    color: 'text-yellow-500',
    progressColor: theme.palette.warning.dark,
    bgColor: theme.palette.warning.dark,
  },
  4: {
    name: 'Peak',
    color: 'text-red-500',
    progressColor: theme.palette.primary.main,
    bgColor: theme.palette.primary.main,
  },
  5: {
    name: 'Max',
    color: 'text-purple-600',
    progressColor: '#9333ea',
    bgColor: '#9C27B0',
  },
}

const UNKNOWN_ZONE_PROPS: HrZoneUi = {
  name: 'Unknown',
  color: 'text-gray-400',
  progressColor: '#9ca3af',
  bgColor: '#9ca3af',
}

export interface HrZoneProps {
  zone: string
  percentage: number
  color: string // Tailwind text color class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
  textColor: string
  bpm: number
}

/**
 * Calculates the current zone, percentage of max HR, and returns MUI-ready props.
 */
export const getHrZoneProps = (
  percentMax: number,
  zone: number,
  bpm: number
): HrZoneProps => {
  const zoneUiProps = HR_ZONE_UI_PROPS_MAP[zone] || UNKNOWN_ZONE_PROPS

  return {
    zone: zoneUiProps.name,
    percentage: percentMax,
    color: zoneUiProps.color,
    progressColor: zoneUiProps.progressColor,
    backgroundColor: zoneUiProps.bgColor,
    textColor: theme.palette.getContrastText(zoneUiProps.bgColor),
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
        color: 'warning',
        backgroundColor: 'bg-yellow-500/10',
        progressColor: '#f59e0b',
      }
    case 'WORK':
      return {
        text: 'WORK',
        color: 'error',
        backgroundColor: 'bg-red-500/10',
        progressColor: '#ef4444',
      }
    case 'REST':
      return {
        text: 'REST',
        color: 'success',
        backgroundColor: 'bg-green-500/10',
        progressColor: '#22c55e',
      }
    case 'RUNNING':
      return {
        text: 'RUNNING',
        color: 'primary',
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#2563eb',
      }
    case 'COOLDOWN':
      return {
        text: 'COOLDOWN',
        color: 'info',
        backgroundColor: 'bg-blue-500/10',
        progressColor: '#3b82f6',
      }
    case 'IDLE':
    default:
      return {
        text: 'READY',
        color: 'secondary',
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
