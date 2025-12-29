// hooks/useHrZone.ts
import { getHrZoneProps } from '@/utils/visualization'
import { useMemo } from 'react'

/**
 * A hook to calculate Heart Rate Zone properties based on current HR and Max HR.
 *
 * @param currentHR - The current heart rate in beats per minute (BPM).
 * @param maxHr - The user's maximum heart rate.
 * @returns An object containing visual properties for the current heart rate zone:
 *  - `percentage`: The percentage of max heart rate (0-100).
 *  - `color`: The primary color associated with the zone (MUI palette color).
 *  - `progressColor`: The specific color code for the progress bar.
 *  - `label`: A text label for the zone (e.g., "Zone 1", "Zone 5").
 */
export const useHrZone = (currentHR: number, maxHr: number) => {
  return useMemo(() => {
    return getHrZoneProps(currentHR, maxHr)
  }, [currentHR, maxHr])
}
