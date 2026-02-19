import { WorkoutSessionData } from '../lib/workout-session-storage'
import { Encoder, Profile } from '@garmin/fitsdk'

/**
 * Generates a FIT binary Blob from a workout session.
 * Uses @garmin/fitsdk to encode heart rate and calorie data.
 */
export const generateFIT = (session: WorkoutSessionData): Blob => {
  const encoder = new Encoder()

  // File ID message
  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: Profile.types.file.ACTIVITY,
    manufacturer: Profile.types.manufacturer.DEVELOPMENT,
    product: 0,
    serialNumber: 0,
    timeCreated: new Date(session.startTime),
  })

  // Session message
  // Use Date.now() if endTime is missing to avoid 0 duration or negative values
  const endTime = session.endTime || Date.now()
  const totalElapsedTime = (endTime - session.startTime) / 1000

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.SESSION,
    startTime: new Date(session.startTime),
    totalElapsedTime: totalElapsedTime,
    totalTimerTime: totalElapsedTime,
    avgHeartRate: Math.round(session.averageHr),
    maxHeartRate: Math.round(session.maxHr),
    totalCalories: Math.round(session.totalCaloriesBurned),
    sport: Profile.types.sport.GENERIC,
  })

  // Record messages
  session.hrHistory.forEach((point) => {
    encoder.writeMesg({
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: new Date(point.time),
      heartRate: Math.round(point.hr),
    })
  })

  return new Blob([encoder.close() as BlobPart], {
    type: 'application/octet-stream',
  })
}
