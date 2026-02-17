import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { Encoder, Profile } from '@garmin/fitsdk'

/**
 * Downloads a file with the given content and filename.
 */
const downloadFile = (
  content: string | Blob,
  fileName: string,
  contentType: string
) => {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Converts workout session data to a CSV string.
 */
export const convertToCSV = (session: WorkoutSessionData): string => {
  const headers = ['Timestamp', 'Heart Rate (BPM)']
  const rows = session.hrHistory.map((point) => [
    new Date(point.time).toISOString(),
    point.hr.toString(),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Exports the workout session as a CSV file.
 */
export const exportToCSV = (session: WorkoutSessionData) => {
  const csv = convertToCSV(session)
  const fileName = `workout-${session.sessionId}.csv`
  downloadFile(csv, fileName, 'text/csv;charset=utf-8;')
}

/**
 * Converts workout session data to a GPX string.
 */
export const convertToGPX = (session: WorkoutSessionData): string => {
  const startTime = new Date(session.startTime).toISOString()
  const name = `Workout ${new Date(session.startTime).toLocaleString()}`

  const trkpts = session.hrHistory
    .map((point) => {
      const time = new Date(point.time).toISOString()
      return `
      <trkpt lat="0.0" lon="0.0">
        <time>${time}</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${point.hr}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HRM App"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

/**
 * Exports the workout session as a GPX file.
 */
export const exportToGPX = (session: WorkoutSessionData) => {
  const gpx = convertToGPX(session)
  const fileName = `workout-${session.sessionId}.gpx`
  downloadFile(gpx, fileName, 'application/gpx+xml;charset=utf-8;')
}

/**
 * Converts workout session data to a FIT file Blob.
 */
export const convertToFIT = (session: WorkoutSessionData): Blob => {
  const encoder = new Encoder(4, 20) // FileType.ACTIVITY (4), ProtocolVersion 2.0

  // 1. File ID Message
  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: 4, // Activity
    manufacturer: 1, // Garmin (or custom)
    product: 0,
    serial_number: 0,
    time_created: Math.floor(session.startTime / 1000) - 631065600, // FIT epoch (since Dec 31, 1989)
  })

  // 2. Record Messages (HR Data)
  session.hrHistory.forEach((point) => {
    // FIT timestamps are seconds since Dec 31, 1989 00:00:00 UTC
    // JS timestamps are milliseconds since Jan 1, 1970 00:00:00 UTC
    // Offset is 631065600 seconds
    const timestamp = Math.floor(point.time / 1000) - 631065600

    encoder.onMesg(Profile.MesgNum.RECORD, {
      timestamp,
      heart_rate: point.hr,
    })
  })

  // 3. Session Message
  const startTimeFit = Math.floor(session.startTime / 1000) - 631065600
  const endTimeFit = session.endTime
    ? Math.floor(session.endTime / 1000) - 631065600
    : Math.floor(Date.now() / 1000) - 631065600
  const totalElapsedTime = (session.endTime || Date.now()) - session.startTime

  encoder.onMesg(Profile.MesgNum.SESSION, {
    timestamp: endTimeFit,
    start_time: startTimeFit,
    total_elapsed_time: totalElapsedTime / 1000,
    total_timer_time: totalElapsedTime / 1000,
    total_calories: Math.round(session.totalCaloriesBurned),
    avg_heart_rate: Math.round(session.averageHr),
    max_heart_rate: session.maxHr,
    sport: 1, // Generic
    sub_sport: 0, // Generic
    event: 9, // Session loop
    event_type: 1, // Stop
  })

  // 4. Activity Message
  encoder.onMesg(Profile.MesgNum.ACTIVITY, {
    timestamp: endTimeFit,
    total_timer_time: totalElapsedTime / 1000,
    num_sessions: 1,
    type: 0, // Manual
    event: 26, // Activity
    event_type: 1, // Stop
  })

  return new Blob([encoder.close() as unknown as BlobPart], {
    type: 'application/octet-stream',
  })
}

/**
 * Exports the workout session as a FIT file.
 */
export const exportToFIT = (session: WorkoutSessionData) => {
  const blob = convertToFIT(session)
  const fileName = `workout-${session.sessionId}.fit`
  downloadFile(blob, fileName, 'application/octet-stream')
}
