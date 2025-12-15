// File: lib/hrm/zones.ts
/**
 * Domain-specific logic for heart rate (HR) calculations and zone management.
 * This module is independent of any specific UI framework or theme.
 */

import { HrZoneName } from '../shared/hr-zones'

// --- Types ---
export interface HeartRateZoneDefinition {
  name: HrZoneName
  min: number // Percentage of Max HR (0-1), inclusive
  max: number // Percentage of Max HR (0-1), exclusive
  color: string // Hex color for UI
}

// --- Constants ---
// SINGLE SOURCE OF TRUTH for Heart Rate Zone Boundaries
export const HR_ZONE_DEFINITIONS: HeartRateZoneDefinition[] = [
  { name: HrZoneName.WarmUp, min: 0.5, max: 0.6, color: '#2196F3' },
  { name: HrZoneName.FatBurn, min: 0.6, max: 0.7, color: '#4CAF50' },
  { name: HrZoneName.Cardio, min: 0.7, max: 0.85, color: '#FFEB3B' },
  { name: HrZoneName.Peak, min: 0.85, max: 0.95, color: '#F44336' },
  { name: HrZoneName.Max, min: 0.95, max: Infinity, color: '#9C27B0' },
]

export interface HrZone {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

/**
 * Calculates the current heart rate zone based on explicit min/max boundaries.
 * @param {number} currentHr - The current heart rate in beats per minute.
 * @param {number} maxHr - The user's maximum heart rate.
 * @returns {HrZone} An object containing the zone name, percentage of max HR, and current BPM.
 */
export const calculateHrZone = (currentHr: number, maxHr: number): HrZone => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: HrZoneName.NoData,
      percentage: 0,
      bpm: 0,
    }
  }

  const percentageDecimal = currentHr / maxHr
  const percentageOfMax = Math.min(100, Math.round(percentageDecimal * 100))

  const currentZone = HR_ZONE_DEFINITIONS.find(
    (zone) => percentageDecimal >= zone.min && percentageDecimal < zone.max
  )

  return {
    zoneName: currentZone ? currentZone.name : HrZoneName.Rest, // Default to Rest for valid HR below zones
    percentage: percentageOfMax,
    bpm: currentHr,
  }
}

/**
 * Calculates the beats per minute (BPM) range for a given heart rate zone.
 * @param {HeartRateZoneDefinition} zone - The heart rate zone definition.
 * @param {number} maxHr - The user's maximum heart rate.
 * @returns {string} The formatted BPM range string (e.g., "120-139 BPM").
 */
export const getZoneBpmRange = (
  zone: HeartRateZoneDefinition,
  maxHr: number
): string => {
  const minBpm = Math.round(zone.min * maxHr)

  if (zone.max === Infinity) {
    return `${minBpm}+ BPM`
  }

  // The max is exclusive, so the display value is 1 less than the next zone's start
  const maxBpm = Math.round(zone.max * maxHr) - 1

  return `${minBpm}-${maxBpm} BPM`
}
