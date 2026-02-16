import type { HeartRateZone, UserHrZones, HrZone } from '../lib/shared/hr-zones'

export type { UserHrZones, HrZone }

export interface HrData {
  bpm: number
  percentMax: number // 0-100
  zone?: HeartRateZone
}
