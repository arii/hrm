// File: utils/visualization.ts (MUI Visualization Utilities - Final Fix)
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { TimerData } from '../types/websocket'
import { WorkoutData, WorkoutItem } from '../types/index'
import { WorkoutColumnsProps } from '@/components/WorkoutColumns'
import theme from '../lib/theme'
import { calculateHrZone } from '../lib/hrm/zones'
import { HrZoneName } from '../lib/shared/hr-zones'

/**
 * Calculates the contrasting text color (black or white) for a given hex background.
 * @param hex - The hex color string (e.g., '#RRGGBB').
 * @returns '#000' (black) or '#fff' (white).
 */
const getContrastingTextColor = (hex: string): string => {
  if (hex.startsWith('#')) {
    hex = hex.slice(1)
  }
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // Formula for luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000' : '#fff'
}

// Define types for MUI color props
type MuiColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

// --- Constants ---
// UI properties for each heart rate zone.
type HrZoneUi = {
  backgroundColor: string
  textColor: string
}

const createZoneStyle = (bgColor: string): HrZoneUi => ({
  backgroundColor: bgColor,
  textColor: getContrastingTextColor(bgColor),
})

export const HR_ZONE_UI_PROPS_MAP: Record<HrZoneName, HrZoneUi> = {
  [HrZoneName.WarmUp]: createZoneStyle(theme.palette.secondary.main),
  [HrZoneName.FatBurn]: createZoneStyle(theme.palette.success.main),
  [HrZoneName.Cardio]: createZoneStyle(theme.palette.warning.dark),
  [HrZoneName.Peak]: createZoneStyle(theme.palette.primary.main),
  [HrZoneName.Max]: createZoneStyle('#9C27B0'),
  [HrZoneName.NoData]: createZoneStyle('#9ca3af'),
  [HrZoneName.Unknown]: createZoneStyle('#9ca3af'),
}

export interface HrZoneProps {
  zone: string
  percentage: number
  backgroundColor: string
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
  const { zoneName, percentage, bpm } = calculateHrZone(currentHr, maxHr)
  const zoneUiProps = HR_ZONE_UI_PROPS_MAP[zoneName]

  return {
    zone: zoneName,
    percentage: percentage,
    backgroundColor: zoneUiProps.backgroundColor,
    textColor: zoneUiProps.textColor,
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
