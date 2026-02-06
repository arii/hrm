import { Theme } from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'

/**
 * Maps a Heart Rate Zone name to the corresponding color from the theme.
 *
 * @param zone - The name of the heart rate zone.
 * @param theme - The MUI theme instance.
 * @returns The hex color string for the zone.
 */
export const getZoneColor = (zone: HrZoneName, theme: Theme): string => {
  const hrZones = theme.palette.custom?.hrZones
  // Fallback to grey if custom palette is missing
  if (!hrZones) return theme.palette.grey[500]

  switch (zone) {
    case HrZoneName.Max:
      return hrZones.max
    case HrZoneName.Peak:
      return hrZones.peak
    case HrZoneName.Cardio:
      return hrZones.cardio
    case HrZoneName.FatBurn:
      return hrZones.fatBurn
    case HrZoneName.WarmUp:
      return hrZones.warmUp
    case HrZoneName.NoData:
      return hrZones.noData
    case HrZoneName.Unknown:
      return hrZones.unknown
    default:
      return theme.palette.grey[500]
  }
}
