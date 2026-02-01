import type { HrZoneName, UserHrZones } from '../lib/shared/hr-zones'

export interface HrZone {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

export type { UserHrZones }

export interface HrData {
  bpm: number
  percentMax: number // 0-100
}
