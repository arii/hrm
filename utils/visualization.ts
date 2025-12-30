// File: utils/visualization.ts (MUI Visualization Utilities - Final Fix)
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { z } from 'zod'
import { TimerData } from '../types/websocket'
import {
  WorkoutDataSchema,
  WorkoutItemSchema,
} from '../lib/validation/schemas' // Corrected import
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'
import theme from '../lib/theme'
import { calculateHrZone } from '../lib/hrm/zones'
import { HrZoneName } from '../lib/shared/hr-zones'

export type WorkoutData = z.infer<typeof WorkoutDataSchema>
export type WorkoutItem = z.infer<typeof WorkoutItemSchema>
// Define types for MUI color props
type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

// --- Constants ---
// UI properties for each heart rate zone, mapped for efficient O(1) lookup.
type HrZoneUi = {
  color: string
  progressColor: string
  bgColor: string
}

export const HR_ZONE_UI_PROPS_MAP: Record<HrZoneName, HrZoneUi> = {
  [HrZoneName.WarmUp]: {
    color: 'text-blue-400',
    progressColor: theme.palette.secondary.main,
    bgColor: theme.palette.secondary.main,
  },
  [HrZoneName.FatBurn]: {
    color: 'text-green-500',
    progressColor: theme.palette.success.main,
    bgColor: theme.palette.success.main,
  },
  [HrZoneName.Cardio]: {
    color: 'text-yellow-500',
    progressColor: theme.palette.warning.dark,
    bgColor: theme.palette.warning.dark,
  },
  [HrZoneName.Peak]: {
    color: 'text-red-500',
    progressColor: theme.palette.primary.main,
    bgColor: theme.palette.primary.main,
  },
  [HrZoneName.Max]: {
    color: 'text-purple-600',
    progressColor: '#9333ea',
    bgColor: '#9C27B0',
  },
  // Add placeholder properties for non-displayable zones
  [HrZoneName.NoData]: {
    color: 'text-gray-400',
    progressColor: '#9ca3af',
    bgColor: '#B0BEC5', // Lighter grey for better visibility
  },
  [HrZoneName.Unknown]: {
    color: 'text-gray-400',
    progressColor: '#9ca3af',
    bgColor: '#9ca3af',
  },
}

// Zone color lookup for easy access (zone 1-5)
export const ZONE_COLORS = {
  grey: '#9E9E9E', // Below zone 1
  blue: theme.palette.secondary.main, // Zone 1: Warm-up
  green: theme.palette.success.main, // Zone 2: Fat Burn
  yellow: theme.palette.warning.main, // Zone 3: Cardio
  red: theme.palette.primary.main, // Zone 4: Peak
  purple: '#9C27B0', // Zone 5: Max
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
 * This function now composes the core business logic from `lib/hrm` with
 * presentation-specific properties defined in this file.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  // 1. Get the core HR data from the domain module
  const { zoneName, percentage, bpm } = calculateHrZone(currentHr, maxHr)

  // 2. Look up the UI properties from the map
  const zoneUiProps = HR_ZONE_UI_PROPS_MAP[zoneName]

  // 3. Determine text color - force white for grey zones for better contrast
  let textColor = theme.palette.getContrastText(zoneUiProps.bgColor)
  if (zoneName === HrZoneName.NoData || zoneName === HrZoneName.Unknown) {
    textColor = '#FFFFFF' // Force white text for grey zones
  }

  // 4. Combine domain data with UI properties
  return {
    zone: zoneName, // The enum member is a string at runtime
    percentage: percentage,
    color: zoneUiProps.color,
    progressColor: zoneUiProps.progressColor,
    backgroundColor: zoneUiProps.bgColor,
    textColor: textColor,
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
