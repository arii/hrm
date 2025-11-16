// File: utils/visualization.ts
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import { Theme } from '@mui/material/styles'
import { TimerData } from '../types/websocket'

// Define types for MUI color props to be used in components
export type MuiThemeColor =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'

// --- HEART RATE ZONE CONFIGURATION ---

interface HrZone {
  name: string
  min: number // Minimum percentage of Max HR for this zone
  color: MuiThemeColor
}

// Defines the boundaries and associated theme colors for each heart rate zone.
export const HR_ZONES: HrZone[] = [
  { name: 'Warm-up', min: 0.5, color: 'info' }, // Light blue
  { name: 'Fat Burn', min: 0.6, color: 'success' }, // Green
  { name: 'Cardio', min: 0.7, color: 'warning' }, // Orange
  { name: 'Peak', min: 0.85, color: 'error' }, // Red
  { name: 'Max', min: 0.95, color: 'secondary' }, // Purple
]

interface HrZoneProps {
  zoneName: string
  percentage: number
  color: MuiThemeColor
  bpm: number
}

/**
 * Calculates the current HR zone and returns MUI-ready props.
 * @param currentHr - The current heart rate in beats per minute.
 * @param maxHr - The user's maximum heart rate.
 * @returns An object with the zone name, percentage of max HR, and associated theme color.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: 'No Data',
      percentage: 0,
      color: 'grey' as MuiThemeColor, // Use grey from palette
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let activeZone: HrZone = { name: 'Resting', min: 0, color: 'grey' as MuiThemeColor }

  // Find the highest applicable zone
  for (const zone of HR_ZONES) {
    if (percentageOfMax / 100 >= zone.min) {
      activeZone = zone
    }
  }

  return {
    zoneName: activeZone.name,
    percentage: percentageOfMax,
    color: activeZone.color,
    bpm: currentHr,
  }
}

// --- TIMER VISUALIZATION ---

interface TimerProps {
  text: string
  color: MuiThemeColor
}

/**
 * Returns theme-based props for the Tabata Timer phase display.
 * @param currentPhase - The current phase from the timer data.
 * @returns An object with the display text and associated theme color.
 */
export const getTimerProps = (
  currentPhase: TimerData['currentPhase']
): TimerProps => {
  switch (currentPhase) {
    case 'PREPARE':
      return { text: 'GET READY', color: 'warning' }
    case 'WORK':
      return { text: 'WORK', color: 'error' }
    case 'REST':
      return { text: 'REST', color: 'success' }
    case 'RUNNING':
      return { text: 'RUNNING', color: 'primary' }
    case 'COOLDOWN':
      return { text: 'COOLDOWN', color: 'info' }
    case 'IDLE':
    default:
      return { text: 'READY', color: 'secondary' }
  }
}
