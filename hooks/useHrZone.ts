// hooks/useHrZone.ts
import { useMemo } from 'react'
import { calculateHrZone } from '@/lib/hrm/zones'
import { getHrZoneColor } from '@/utils/visualization'
import { HrZoneName } from '@/lib/shared/hr-zones'

/**
 * A hook to calculate Heart Rate Zone properties based on current HR and Max HR.
 *
 * @param currentHR - The current heart rate in beats per minute (BPM).
 * @param maxHr - The user's maximum heart rate.
 * @returns An object containing visual properties for the current heart rate zone:
 *  - `percentage`: The percentage of max heart rate (0-100).
 *  - `progressColor`: The specific color code for the progress bar.
 *  - `label`: A text label for the zone (e.g., "Warm-up", "Peak").
 */
export const useHrZone = (currentHR: number, maxHr: number) => {
  return useMemo(() => {
    if (!currentHR || !maxHr) {
      return {
        percentage: 0,
        progressColor: 'grey',
        label: HrZoneName.NoData,
      }
    }

    const { percentage, zoneName } = calculateHrZone(currentHR, maxHr)
    const color = getHrZoneColor(zoneName)

    return {
      percentage,
      progressColor: color,
      label: zoneName,
    }
  }, [currentHR, maxHr])
}
