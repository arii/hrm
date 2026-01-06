import { FitWriter } from '@markw65/fit-file-writer'

interface FitExportData {
  startTime: number // ms timestamp
  durationSeconds: number
  totalCalories: number
  records: Array<{
    time: number // ms timestamp
    hr: number
  }>
  age?: number
  weightKg?: number
}

const MANUFACTURER_ID = 'development' // Or a proper ID if registered with Garmin/ANT+
const PRODUCT_ID = 0 // Or a specific product ID
const SERIAL_NUMBER = 0x12345678 // Unique serial number for the device

export const generateFitFile = (data: FitExportData): Blob => {
  const fitWriter = new FitWriter()

  const startDate = new Date(data.startTime)
  const startFitTime = fitWriter.time(startDate)

  // 1. File ID Message (Required for all FIT files)
  fitWriter.writeMessage('file_id', {
    type: 'activity',
    manufacturer: MANUFACTURER_ID,
    product: PRODUCT_ID,
    serial_number: SERIAL_NUMBER,
    time_created: startFitTime,
  })

  // 2. Session Message (Summary)
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

  // 3. User Profile Message (Optional)
  if (data.age && data.weightKg) {
    fitWriter.writeMessage('user_profile', {
      weight: data.weightKg,
      age: data.age,
    })
  }

  // 4. Record Messages (Time Series)
  data.records.forEach((record) => {
    fitWriter.writeMessage('record', {
      timestamp: fitWriter.time(new Date(record.time)),
      heart_rate: record.hr,
    })
  })

  const dataView = fitWriter.finish()
  const uint8Array = new Uint8Array(
    dataView.buffer,
    dataView.byteOffset,
    dataView.byteLength
  )
  return new Blob([uint8Array], { type: 'application/octet-stream' })
}
