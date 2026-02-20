// This file is for component-specific prop types.
// All other types should be defined in their respective files.

import { HeartRateZone } from '@/lib/shared/hr-zones'

export interface HrTileProps {
  value?: number | null
  percentage?: number
  zone?: HeartRateZone
  name?: string
  calories?: number
  isConnected?: boolean
  isDataStale?: boolean
  isAlerting?: boolean
  alertMessage?: string
}

export interface DashboardSectionLoadingSkeletonProps {
  width?: string
  height?: string
  shape?: 'rectangular' | 'circular'
  count?: number
  className?: string
}
