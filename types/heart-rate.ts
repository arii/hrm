import type { HeartRateZone, UserHrZones } from '../lib/shared/hr-zones'

export interface HrZone {
  zoneName: HeartRateZone
  percentage: number
  bpm: number
}

export type { UserHrZones }

export interface HrData {
  bpm: number
  percentMax: number // 0-100
  zone?: HeartRateZone
}
