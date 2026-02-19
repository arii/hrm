// utils/fit-export.ts
import { Encoder } from '@garmin/fitsdk'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Garmin Epoch: December 31, 1989 00:00:00 UTC
const GARMIN_EPOCH_MS = 631065600000

function toGarminTime(timestamp: number): number {
  return Math.floor((timestamp - GARMIN_EPOCH_MS) / 1000)
}

export function generateFitFile(session: WorkoutSessionData): Blob {
  const encoder = new Encoder()

  // File ID Message
  encoder.writeMesg({
    mesgNum: 0, // file_id
    type: 4, // activity
    manufacturer: 255, // development
    product: 0,
    serialNumber: 0,
    timeCreated: toGarminTime(session.startTime),
  })

  // Session Message
  const duration = session.endTime
    ? (session.endTime - session.startTime) / 1000
    : 0

  encoder.writeMesg({
    mesgNum: 18, // session
    startTime: toGarminTime(session.startTime),
    totalTimerTime: duration,
    totalElapsedTime: duration,
    totalCalories: Math.round(session.totalCaloriesBurned),
    avgHeartRate: Math.round(session.averageHr),
    maxHeartRate: Math.round(session.maxHr),
    event: 9, // session
    eventType: 1, // stop
    sport: 1, // generic
    subSport: 0, // generic
    trigger: 0, // manual
  })

  // Record Messages (HR Data)
  session.hrHistory.forEach((point) => {
    encoder.writeMesg({
      mesgNum: 20, // record
      timestamp: toGarminTime(point.time),
      heartRate: point.hr,
    })
  })

  // Close encoder and get Uint8Array
  const uint8Array = encoder.close()

  return new Blob([uint8Array as unknown as BlobPart], {
    type: 'application/fit',
  })
}
