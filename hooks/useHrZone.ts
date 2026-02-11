import { useMemo } from 'react'
import { calculateZoneFromMaxHr, HR_ZONE_VISUAL_CONFIG } from '@/lib/shared/hr-zones'

export const useHrZone = (currentHr: number, maxHr: number) => {
  return useMemo(() => {
    const { percentage, zone } = calculateZoneFromMaxHr(currentHr, maxHr)
    const zoneConfig =
      HR_ZONE_VISUAL_CONFIG[zone as keyof typeof HR_ZONE_VISUAL_CONFIG] ||
      HR_ZONE_VISUAL_CONFIG[0]

    return {
      percentage,
      zone,
      progressColor: zoneConfig.color,
    }
  }, [currentHr, maxHr])
}
