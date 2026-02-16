import type { HeartRateZone, UserHrZones } from '../lib/shared/hr-zones'

export type { UserHrZones }

export interface HrData {
  bpm: number
  percentMax: number // 0-100
  zone?: HeartRateZone
}
