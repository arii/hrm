import { Encoder } from '@garmin/fitsdk'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Constants derived from the FIT SDK Profile
// We define them locally to avoid runtime import issues with the SDK's ES module exports
const FileId = {
  Type: {
    ACTIVITY: 4,
  },
}

const Manufacturer = {
  DEVELOPMENT: 255,
}

/**
 * Generates a FIT file from the provided workout session data.
 * This runs entirely on the client side using @garmin/fitsdk.
 */
export async function generateFitFile(
  session: WorkoutSessionData
): Promise<Blob> {
  const encoder = new Encoder()

  // 1. FileId Message
  // The first message in a FIT file must be the FileId message
  encoder.write({
    fileId: {
      type: FileId.Type.ACTIVITY,
      manufacturer: Manufacturer.DEVELOPMENT,
      product: 0,
      serialNumber: 0,
      timeCreated: new Date(session.startTime),
    },
  })

  // 2. Record Messages
  // These represent the time-series data (e.g., heart rate)
  session.hrHistory.forEach((point) => {
    // Find corresponding calorie data if available
    // For simplicity and performance, we'll just write HR for now
    // as exact alignment between arrays isn't guaranteed without more complex logic
    encoder.write({
      record: {
        timestamp: new Date(point.time),
        heartRate: point.hr,
      },
    })
  })

  // 3. Session Message
  // This provides the summary statistics for the activity
  const endTime = session.endTime ? new Date(session.endTime) : new Date()
  const durationSeconds = (endTime.getTime() - session.startTime) / 1000

  encoder.write({
    session: {
      timestamp: endTime,
      startTime: new Date(session.startTime),
      totalElapsedTime: durationSeconds,
      totalTimerTime: durationSeconds,
      totalCalories: Math.round(session.totalCaloriesBurned),
      avgHeartRate: Math.round(session.averageHr),
      maxHeartRate: session.maxHr,
    },
  })

  // 4. Finalize
  // encoder.close() returns a Uint8Array. We must access its buffer property
  // when creating the Blob to avoid type mismatches.
  const uint8Array = encoder.close()
  return new Blob([uint8Array.buffer as ArrayBuffer], {
    type: 'application/octet-stream',
  })
}
