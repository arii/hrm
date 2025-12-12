// File: utils/visualization.ts (MUI Visualization Utilities - Final Fix)
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
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

// --- Constants ---
// Heart Rate Zone Boundaries (as percentage of Max HR)
export const HR_ZONES = [
  {
    name: 'Warm-up',
    min: 0.5,
    color: 'text-blue-600',
    progressColor: theme.palette.secondary.main, // #1976D2
    bgColor: theme.palette.secondary.light, // #E3F2FD
    textColor: theme.palette.secondary.dark, // #0D47A1
  },
  {
    name: 'Fat Burn',
    min: 0.6,
    color: 'text-green-600',
    progressColor: theme.palette.success.main, // #388E3C
    bgColor: theme.palette.success.light, // #E8F5E9
    textColor: theme.palette.success.dark, // #1B5E20
  },
  {
    name: 'Cardio',
    min: 0.7,
    color: 'text-yellow-600',
    progressColor: theme.palette.warning.main, // #FBC02D
    bgColor: theme.palette.warning.light, // #FFFDE7
    textColor: '#E65100', // High contrast orange for yellow bg
  },
  {
    name: 'Peak',
    min: 0.85,
    color: 'text-red-600',
    progressColor: theme.palette.error.main, // #D32F2F
    bgColor: theme.palette.primary.light, // #FFEBEE (Very light red)
    textColor: theme.palette.error.dark, // #C62828
  },
  {
    name: 'Max',
    min: 0.95,
    color: 'text-purple-600',
    progressColor: '#7B1FA2', // Darker Purple
    bgColor: '#F3E5F5', // Light Purple
    textColor: '#4A148C', // Very Dark Purple
  },
]

// Zone color lookup for easy access (zone 1-5)
export const ZONE_COLORS = {
  grey: '#9E9E9E', // Below zone 1
  blue: theme.palette.secondary.main, // Zone 1: Warm-up
  green: theme.palette.success.main, // Zone 2: Fat Burn
  yellow: theme.palette.warning.main, // Zone 3: Cardio
  red: theme.palette.error.main, // Zone 4: Peak
  purple: '#7B1FA2', // Zone 5: Max
}

interface HrZoneProps {
  zone: string
  percentage: number
  color: string // Tailwind text color class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
  textColor: string // Hex color for text
  bpm: number
}

/**
 * Calculates the current zone, percentage of max HR, and returns MUI-ready props.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zone: 'No Data',
      percentage: 0,
      color: 'text-gray-400',
      progressColor: theme.palette.grey[400],
      backgroundColor: theme.palette.grey[200],
      textColor: theme.palette.grey[700],
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let zone = HR_ZONES[0]

  for (let i = HR_ZONES.length - 1; i >= 0; i--) {
    const hrZone = HR_ZONES[i]
    if (hrZone && percentageOfMax / 100 >= hrZone.min) {
      zone = hrZone
      break
    }
  }

  if (!zone) {
    return {
      zone: 'Unknown',
      percentage: percentageOfMax,
      color: 'text-gray-400',
      progressColor: theme.palette.grey[400],
      backgroundColor: theme.palette.grey[200],
      textColor: theme.palette.grey[700],
      bpm: currentHr,
    }
  }

  return {
    zone: zone.name,
    percentage: percentageOfMax,
    color: zone.color,
    progressColor: zone.progressColor,
    backgroundColor: zone.bgColor,
    textColor: zone.textColor,
    bpm: currentHr,
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
        progressColor: theme.palette.warning.main,
      }
    case 'WORK':
      return {
        text: 'WORK',
        color: 'error',
        backgroundColor: 'bg-red-500/10',
        progressColor: theme.palette.error.main,
      }
    case 'REST':
      return {
        text: 'REST',
        color: 'success',
        backgroundColor: 'bg-green-500/10',
        progressColor: theme.palette.success.main,
      }
    case 'RUNNING':
      return {
        text: 'RUNNING',
        // Use 'secondary' for blue
        color: 'secondary',
        backgroundColor: 'bg-blue-500/10',
        progressColor: theme.palette.secondary.main,
      }
    case 'COOLDOWN':
      return {
        text: 'COOLDOWN',
        color: 'info',
        backgroundColor: 'bg-blue-400/10',
        progressColor: theme.palette.info.main,
      }
    case 'IDLE':
    default:
      return {
        text: 'READY',
        color: 'secondary',
        backgroundColor: 'bg-gray-200',
        progressColor: theme.palette.grey[500],
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
