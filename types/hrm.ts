// types/hrm.ts
export interface Session {
  id: string
  userName: string
  startTime: number
  endTime?: number
  avgBpm?: number
  totalCalories?: number
  deviceId?: string
}

export interface Measurement {
  sessionId: string
  timestamp: number
  bpm: number
  caloriesAccumulated?: number
  zoneLabel?: string
}

export interface SessionWithMeasurements extends Session {
  measurements: Measurement[]
}
