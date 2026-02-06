// hooks/useHrZone.ts
import { useMemo } from 'react'
import { calculateHrZone, HrZoneName } from '@/lib/shared/hr-zones'
import { HR_ZONE_UI_PROPS_MAP } from '@/utils/visualization'
import theme from '@/lib/theme'

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
    const { zoneName, percentage, bpm } = calculateHrZone(currentHR, maxHr)
    const zoneUiProps = HR_ZONE_UI_PROPS_MAP[zoneName]

    let textColor = theme.palette.getContrastText(zoneUiProps.bgColor)
    if (
      zoneName === HrZoneName.NoData ||
      zoneName === HrZoneName.Unknown ||
      zoneName === HrZoneName.FatBurn ||
      zoneName === HrZoneName.Cardio
    ) {
      textColor = '#FFFFFF'
    }

    return {
      zone: zoneName,
      percentage: percentage,
      color: zoneUiProps.color,
      progressColor: zoneUiProps.progressColor,
      backgroundColor: zoneUiProps.bgColor,
      textColor: textColor,
      bpm: bpm,
    }
  }, [currentHR, maxHr])
}
