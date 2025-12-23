// File: lib/hrm/zones.ts
/**
 * Domain-specific logic for heart rate (HR) calculations and zone management.
 * This module is independent of any specific UI framework or theme.
 */

import { HeartRate } from './HeartRate'
import { HrZoneName } from '../shared/hr-zones'

// --- Constants ---
// Heart Rate Zone Boundaries (as percentage of Max HR)
export const HR_ZONE_DEFINITIONS = [
  { name: HrZoneName.WarmUp, min: 0.5 },
  { name: HrZoneName.FatBurn, min: 0.6 },
  { name: HrZoneName.Cardio, min: 0.7 },
  { name: HrZoneName.Peak, min: 0.85 },
  { name: HrZoneName.Max, min: 0.95 },
]

export interface HrZone {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 * @param {HeartRate} currentHr - The current heart rate value object.
 * @param {HeartRate} maxHr - The user's maximum heart rate value object.
 * @returns {HrZone} An object containing the zone name, percentage of max HR, and current BPM.
 */
export const calculateHrZone = (
  currentHr: HeartRate,
  maxHr: HeartRate
): HrZone => {
  if (currentHr.getValue() <= 0 || maxHr.getValue() <= 0) {
    return {
      zoneName: HrZoneName.NoData,
      percentage: 0,
      bpm: 0,
    }
  }

  const percentageOfMax = currentHr.percentageOf(maxHr)
  let calculatedZone = HR_ZONE_DEFINITIONS[0]!

  // Iterate backwards to find the correct zone
  for (let i = HR_ZONE_DEFINITIONS.length - 1; i >= 0; i--) {
    const hrZone = HR_ZONE_DEFINITIONS[i]
    if (hrZone && percentageOfMax / 100 >= hrZone.min) {
      calculatedZone = hrZone
      break
    }
  }

  return {
    zoneName: calculatedZone.name,
    percentage: percentageOfMax,
    bpm: currentHr.getValue(),
  }
}
