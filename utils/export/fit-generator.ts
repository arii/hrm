import * as FitFile from '@markw65/fit-file-writer'
import { WorkoutExportData } from '@/types'

export const generateFitFile = (data: WorkoutExportData): Blob => {
  const fitWriter = new FitFile.FitWriter()

  const startDate = new Date(data.startTime)
  const startFitTime = fitWriter.time(startDate)

  // File ID Message (Required)
  fitWriter.writeMessage('file_id', {
    type: 'activity',
    manufacturer: 'development',
    product: 0,
    serial_number: 0x12345678,
    time_created: startFitTime,
  })

  // User Profile Message (Optional)
  if (data.userAge || data.userWeight) {
    fitWriter.writeMessage('user_profile', {
      gender: data.gender,
      age: data.userAge,
      weight: data.userWeight,
      message_index: { value: 0 },
    })
  }

  // Session Message (Summary)
  fitWriter.writeMessage('session', {
    start_time: startFitTime,
    total_elapsed_time: data.durationSeconds,
    total_timer_time: data.durationSeconds,
    total_calories: Math.round(data.totalCalories),
    sport: 'generic',
    sub_sport: 'generic',
    timestamp: fitWriter.time(
      new Date(data.startTime + data.durationSeconds * 1000)
    ),
  })

  // Record Messages (Time Series)
  data.records.forEach((record) => {
    fitWriter.writeMessage('record', {
      timestamp: fitWriter.time(new Date(record.time)),
      heart_rate: record.hr,
    })
  })

  const bytes = fitWriter.finish()
  // The finish() method returns a DataView. To ensure full compatibility
  // with the Blob constructor and avoid potential issues with SharedArrayBuffer,
  // we manually create a new ArrayBuffer and copy the data.
  const buffer = new ArrayBuffer(bytes.byteLength)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    view[i] = bytes.getUint8(i)
  }
  return new Blob([buffer], {
    type: 'application/octet-stream',
  })
}
