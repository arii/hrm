import type { Theme, Palette } from '@mui/material'
import { HrZoneName } from '@/lib/shared/hr-zones'

const ZONE_COLOR_MAP: Partial<
  Record<HrZoneName, keyof Palette['custom']['hrZones']>
> = {
  [HrZoneName.Max]: 'max',
  [HrZoneName.Peak]: 'peak',
  [HrZoneName.Cardio]: 'cardio',
  [HrZoneName.FatBurn]: 'fatBurn',
  [HrZoneName.WarmUp]: 'warmUp',
  [HrZoneName.NoData]: 'noData',
  [HrZoneName.Unknown]: 'unknown',
}

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

  const colorKey = ZONE_COLOR_MAP[zone]
  return (colorKey && hrZones[colorKey]) || theme.palette.grey[500]
}
