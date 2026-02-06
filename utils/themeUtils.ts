import { Theme } from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'

/**
 * Maps a Heart Rate Zone name to the corresponding color from the theme.
 *
 * @param zone - The name of the heart rate zone.
 * @param theme - The MUI theme instance.
 * @returns The hex color string for the zone.
 */
export const getZoneColor = (zone: string, theme: Theme): string => {
  const hrZones = theme.palette.custom?.hrZones
  // Fallback to grey if custom palette is missing
  if (!hrZones) return theme.palette.grey[500]

  const zoneColorMap: Record<string, string | undefined> = {
    [HrZoneName.Max]: hrZones.max,
    [HrZoneName.Peak]: hrZones.peak,
    [HrZoneName.Cardio]: hrZones.cardio,
    [HrZoneName.FatBurn]: hrZones.fatBurn,
    [HrZoneName.WarmUp]: hrZones.warmUp,
    [HrZoneName.NoData]: hrZones.noData,
    [HrZoneName.Unknown]: hrZones.unknown,
  }

  return zoneColorMap[zone] || theme.palette.grey[500]
}
