// File: lib/hrm/zones.ts
/**
 * Domain-specific logic for heart rate (HR) calculations and zone management.
 * This module is independent of any specific UI framework or theme.
 */

import {
  HrZoneName,
  calculateHrZoneInfo,
  getHrZoneLabel,
} from '../shared/hr-zones'

export { HrZoneName }

import { HrZone } from '../../types/heart-rate'

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 *
 * NOTE: This is a legacy wrapper around calculateHrZoneInfo to maintain compatibility
 * with existing Dashboard UI components that expect the HrZone interface.
 *
 * @param {number} currentHr - The current heart rate in beats per minute.
 * @param {number} maxHr - The user's maximum heart rate (used to derive age for calculation).
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

  // Derive age from maxHr (220 - age = maxHr => age = 220 - maxHr)
  const age = 220 - maxHr
  const { percentage, zone } = calculateHrZoneInfo(currentHr, age)

  return {
    zoneName: getHrZoneLabel(zone) as HrZoneName,
    percentage: percentage,
    bpm: currentHr,
  }
}
