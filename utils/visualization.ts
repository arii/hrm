// File: utils/visualization.ts (MUI Visualization Utilities - Final Fix)
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { TimerData } from '../types/websocket'

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
    color: 'text-blue-400',
    progressColor: '#3b82f6', // Darker blue
    bgColor: '#3b82f6', // Darker blue
    gradient: 'from-blue-400 to-blue-500',
    glow: '#3b82f6',
  },
  {
    name: 'Fat Burn',
    min: 0.6,
    color: 'text-green-500',
    progressColor: '#22c55e',
    bgColor: '#4CAF50',
    gradient: 'from-green-400 to-green-500',
    glow: '#22c55e',
  },
  {
    name: 'Cardio',
    min: 0.7,
    color: 'text-yellow-500',
    progressColor: '#d97706', // Darker orange/yellow
    bgColor: '#d97706', // Darker orange/yellow
    gradient: 'from-yellow-400 to-yellow-500',
    glow: '#d97706',
  },
  {
    name: 'Peak',
    min: 0.85,
    color: 'text-red-500',
    progressColor: '#ef4444',
    bgColor: '#F44336',
    gradient: 'from-red-400 to-red-500',
    glow: '#ef4444',
  },
  {
    name: 'Max',
    min: 0.95,
    color: 'text-purple-600',
    progressColor: '#9333ea',
    bgColor: '#9C27B0',
    gradient: 'from-purple-500 to-purple-600',
    glow: '#9333ea',
  },
]

// Zone color lookup for easy access (zone 1-5)
export const ZONE_COLORS = {
  grey: '#9E9E9E', // Below zone 1
  blue: '#2196F3', // Zone 1: Warm-up
  green: '#4CAF50', // Zone 2: Fat Burn
  yellow: '#FFEB3B', // Zone 3: Cardio
  red: '#F44336', // Zone 4: Peak
  purple: '#9C27B0', // Zone 5: Max
}

interface HrZoneProps {
  zone: string
  percentage: number
  color: string // Tailwind text color class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
  gradient: string // Tailwind gradient classes
  glow: string // Tailwind shadow/glow class
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
      progressColor: '#9ca3af',
      backgroundColor: '#9ca3af',
      gradient: 'from-gray-400 to-gray-500',
      glow: '#9ca3af',
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
      progressColor: '#9ca3af',
      backgroundColor: '#9ca3af',
      gradient: 'from-gray-400 to-gray-500',
      glow: '#9ca3af',
      bpm: currentHr,
    }
  }

  return {
    zone: zone.name,
    percentage: percentageOfMax,
    color: zone.color,
    progressColor: zone.progressColor,
    backgroundColor: zone.bgColor,
    gradient: zone.gradient,
    glow: zone.glow,
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
