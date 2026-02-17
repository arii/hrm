import { WorkoutSessionData } from '../lib/workout-session-storage'
import { Encoder, Profile } from '@garmin/fitsdk'

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

  return Buffer.from(encoder.close())
}

/**
 * Generates a GPX string from a workout session.
 * Uses Garmin TrackPointExtension to include heart rate data.
 */
export const generateGPX = (session: WorkoutSessionData): string => {
  const timeCreated = new Date(session.startTime).toISOString()

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HRM App" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpt="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
  <metadata>
    <time>${timeCreated}</time>
  </metadata>
  <trk>
    <name>Workout Session ${session.sessionId}</name>
    <trkseg>
`

  session.hrHistory.forEach((point) => {
    const time = new Date(point.time).toISOString()
    const hr = Math.round(point.hr)

    gpx += `      <trkpt lat="0.0" lon="0.0">
        <time>${time}</time>
        <extensions>
          <gpt:TrackPointExtension>
            <gpt:hr>${hr}</gpt:hr>
          </gpt:TrackPointExtension>
        </extensions>
      </trkpt>
`
  })

  gpx += `    </trkseg>
  </trk>
</gpx>`

  return gpx
}
