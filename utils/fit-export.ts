// utils/fit-export.ts
import { Encoder } from '@garmin/fitsdk'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Garmin Epoch: December 31, 1989 00:00:00 UTC
const GARMIN_EPOCH_MS = 631065600000

// FIT Message Numbers
const FIT_MESG_NUM = {
  FILE_ID: 0,
  SESSION: 18,
  RECORD: 20,
} as const

// FIT Field Values
const FIT_CONSTANTS = {
  FILE_TYPE_ACTIVITY: 4,
  MANUFACTURER_DEVELOPMENT: 255,
  EVENT_SESSION: 9,
  EVENT_TYPE_STOP: 1,
  SPORT_GENERIC: 1,
  SUB_SPORT_GENERIC: 0,
  TRIGGER_MANUAL: 0,
}

function toGarminTime(timestamp: number): number {
  return Math.floor((timestamp - GARMIN_EPOCH_MS) / 1000)
}

export function generateFitFile(
  session: WorkoutSessionData,
  generationTimestamp: number = Date.now()
): Blob {
  const encoder = new Encoder()

  encoder.writeMesg({
    mesgNum: FIT_MESG_NUM.FILE_ID,
    type: FIT_CONSTANTS.FILE_TYPE_ACTIVITY,
    manufacturer: FIT_CONSTANTS.MANUFACTURER_DEVELOPMENT,
    product: 0,
    serialNumber: 0,
    timeCreated: toGarminTime(session.startTime),
  })

  session.hrHistory.forEach((point) => {
    encoder.writeMesg({
      mesgNum: FIT_MESG_NUM.RECORD,
      timestamp: toGarminTime(point.time),
      heartRate: point.hr,
    })
  })

  const endTime = session.endTime || generationTimestamp
  const duration = (endTime - session.startTime) / 1000

  encoder.writeMesg({
    mesgNum: FIT_MESG_NUM.SESSION,
    timestamp: toGarminTime(endTime),
    startTime: toGarminTime(session.startTime),
    totalTimerTime: duration,
    totalElapsedTime: duration,
    totalCalories: Math.round(session.totalCaloriesBurned),
    avgHeartRate: Math.round(session.averageHr),
    maxHeartRate: Math.round(session.maxHr),
    event: FIT_CONSTANTS.EVENT_SESSION,
    eventType: FIT_CONSTANTS.EVENT_TYPE_STOP,
    sport: FIT_CONSTANTS.SPORT_GENERIC,
    subSport: FIT_CONSTANTS.SUB_SPORT_GENERIC,
    trigger: FIT_CONSTANTS.TRIGGER_MANUAL,
  })

  const uint8Array = encoder.close()

  // Uint8Array is natively compatible with BlobPart
  return new Blob([uint8Array], {
    type: 'application/fit',
  })
}
