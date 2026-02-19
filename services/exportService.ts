import { WorkoutSessionData } from '../lib/workout-session-storage'
import { Encoder, Profile, Stream } from '@garmin/fitsdk'

/**
 * Generates a FIT binary Blob from a workout session.
 */
export const generateFIT = (session: WorkoutSessionData): Blob => {
  const stream = new Stream.MemoryStream()
  const encoder = new Encoder(stream)

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: Profile.types.file.ACTIVITY,
    manufacturer: Profile.types.manufacturer.DEVELOPMENT,
    product: 0,
    serialNumber: 0,
    timeCreated: new Date(session.startTime),
  })

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

  session.hrHistory.forEach((point) => {
    encoder.writeMesg({
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: new Date(point.time),
      heartRate: Math.round(point.hr),
    })
  })

  // Ensure we return the buffer correctly based on standard usage
  // Casting to any to avoid "Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'"
  // in strict CI environments where ArrayBufferLike definitions might mismatch.
  return new Blob([stream.bytes as unknown as BlobPart], {
    type: 'application/octet-stream',
  })
}
