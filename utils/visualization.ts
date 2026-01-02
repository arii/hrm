import { HrZoneName } from '@/lib/shared/hr-zones'
import theme from '@/lib/theme'

export const getHrZoneColor = (zoneName: HrZoneName): string => {
  switch (zoneName) {
    case HrZoneName.WarmUp:
      return theme.palette.secondary.main
    case HrZoneName.FatBurn:
      return theme.palette.success.main
    case HrZoneName.Cardio:
      return theme.palette.warning.main
    case HrZoneName.Peak:
      return theme.palette.error.main
    case HrZoneName.Max:
      return theme.palette.error.dark
    default:
      return theme.palette.grey[500]
  }
}
