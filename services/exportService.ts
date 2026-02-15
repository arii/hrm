// services/exportService.ts
import { WorkoutSessionData } from '../lib/workout-session-storage'
import { Encoder, Profile } from '@garmin/fitsdk'

/**
 * Generates a GPX XML string from a workout session.
 * Following Strava's stationary GPX format for heart rate data.
 */
export const generateGPX = (session: WorkoutSessionData): string => {
  const startTime = new Date(session.startTime).toISOString()
  const trackPoints = session.hrHistory
    .map((point) => {
      const time = new Date(point.time).toISOString()
      return `<trkpt lat="0.0" lon="0.0">
  <time>${time}</time>
  <extensions>
    <gpxtpx:TrackPointExtension xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
      <gpxtpx:hr>${point.hr}</gpxtpx:hr>
    </gpxtpx:TrackPointExtension>
  </extensions>
</trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HRM-App" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>Workout ${session.sessionId}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`
}

/**
 * Generates a FIT binary buffer from a workout session.
 * Uses @garmin/fitsdk to encode heart rate and calorie data.
 */
export const generateFIT = (session: WorkoutSessionData): Buffer => {
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
  const totalElapsedTime = session.endTime
    ? (session.endTime - session.startTime) / 1000
    : 0
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

  return Buffer.from(encoder.close())
}
