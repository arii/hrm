// File: utils/visualization.ts (MUI Visualization Utilities - Final Fix)
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import theme from '../lib/theme'
import { calculateHrZone } from '../lib/hrm/zones'
import { HrZoneName } from '../lib/shared/hr-zones'

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

const HR_ZONE_UI_PROPS_MAP: Record<HrZoneName, HrZoneUi> = {
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
    bgColor: '#9ca3af',
  },
  [HrZoneName.Unknown]: {
    color: 'text-gray-400',
    progressColor: '#9ca3af',
    bgColor: '#9ca3af',
  },
}

interface HrZoneProps {
  zone: string
  percentage: number
  color: string // Tailwind text color class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
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

  // 3. Combine domain data with UI properties
  return {
    zone: zoneName, // The enum member is a string at runtime
    percentage: percentage,
    color: zoneUiProps.color,
    progressColor: zoneUiProps.progressColor,
    backgroundColor: zoneUiProps.bgColor,
    bpm: bpm,
  }
}
