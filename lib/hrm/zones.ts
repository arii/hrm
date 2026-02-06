// File: lib/hrm/zones.ts
/**
 * Domain-specific logic for heart rate (HR) calculations and zone management.
 * This module is independent of any specific UI framework or theme.
 */

import { HrZoneName, calculateZoneFromMaxHr } from '../shared/hr-zones'
import { HrZone } from '../../types/heart-rate'

export { HrZoneName }

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 * Delegates to the shared logic in lib/shared/hr-zones.ts.
 *
 * @param {number} currentHr - The current heart rate in beats per minute.
 * @param {number} maxHr - The user's maximum heart rate.
 * @returns {HrZone} An object containing the zone name, percentage of max HR, and current BPM.
 */
export const calculateHrZone = (currentHr: number, maxHr: number): HrZone => {
  return calculateZoneFromMaxHr(currentHr, maxHr)
}
