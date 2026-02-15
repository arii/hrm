// utils/export.ts
import { WorkoutSessionData } from '@/lib/workout-session-storage'

/**
 * Converts workout session data to a CSV string.
 */
export const convertToCSV = (session: WorkoutSessionData): string => {
  const headers = ['Timestamp', 'Heart Rate (BPM)', 'Total Calories']
  const rows = session.hrHistory.map((point) => [
    new Date(point.time).toISOString(),
    point.hr.toString(),
    point.calories?.toFixed(2) ?? '',
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
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
 * Triggers a download of the provided content.
 */
export const downloadFile = (
  content: string,
  fileName: string,
  contentType: string
) => {
  const blob = new Blob([content], { type: contentType })
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
 * Exports the workout session as a CSV file.
 */
export const exportToCSV = (session: WorkoutSessionData) => {
  const csv = convertToCSV(session)
  const fileName = `workout-${session.sessionId}.csv`
  downloadFile(csv, fileName, 'text/csv;charset=utf-8;')
}

/**
 * Exports the workout session as a GPX file.
 */
export const exportToGPX = (session: WorkoutSessionData) => {
  const gpx = convertToGPX(session)
  const fileName = `workout-${session.sessionId}.gpx`
  downloadFile(gpx, fileName, 'application/gpx+xml;charset=utf-8;')
}
