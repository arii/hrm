// File: utils/visualization.ts
/**
 * Utility functions to map numerical and state data to MUI aesthetic properties.
 * This ensures clean separation of business logic from React component rendering.
 */
import {
  calculateZoneFromMaxHr,
  toHeartRateZone,
  HR_ZONE_CONFIG,
  HeartRateZone,
} from '@/lib/shared/hr-zones'

interface HrZoneProps {
  zone: HeartRateZone
  percentage: number
  color: string // Legacy: Hex color or Tailwind class
  progressColor: string // Hex color for MUI components
  backgroundColor: string // Hex color for background
  textColor: string
  value: number
}

/**
 * Calculates the current zone, percentage of max HR, and returns MUI-ready props.
 * Leveraging the centralized HR_ZONE_CONFIG for consistency.
 */
export const getHrZoneProps = (
  currentHr: number,
  maxHr: number
): HrZoneProps => {
  // 1. Get the core HR data
  const { zone, percentage } = calculateZoneFromMaxHr(currentHr, maxHr)
  const zoneName = toHeartRateZone(zone)

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
    value: currentHr,
  }
}
