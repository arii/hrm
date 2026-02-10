// File: lib/hrm/zones.ts
/**
 * Domain-specific logic for heart rate (HR) calculations and zone management.
 * This module is independent of any specific UI framework or theme.
 */

import {
  HrZoneName,
  calculateZoneFromMaxHr,
  getHrZoneLabel,
} from '../shared/hr-zones'

export { HrZoneName }

import { HrZone } from '../../types/heart-rate'

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 *
 * NOTE: This is a legacy wrapper around calculateZoneFromMaxHr to maintain compatibility
 * with existing Dashboard UI components that expect the HrZone interface.
 *
 * @deprecated Use `calculateHrZoneInfo` from `lib/shared/hr-zones` instead.
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

  const { percentage, zone } = calculateZoneFromMaxHr(currentHr, maxHr)

  // Canonical mapping from shared HR zones
  const zoneName = getHrZoneLabel(zone) as HrZoneName

  return {
    zoneName,
    percentage: percentage,
    bpm: currentHr,
  }
}
