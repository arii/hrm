import { FitWriter } from '@markw65/fit-file-writer'

interface FitExportData {
  startTime: number // ms timestamp
  durationSeconds: number
  totalCalories: number
  userAge: number
  userWeight: number
  records: Array<{
    time: number // ms timestamp
    hr: number
  }>
}

export const generateFitFile = (data: FitExportData): Blob => {
  const fitWriter = new FitWriter()

  // 1. Convert JS time (ms since 1970) to FIT time (seconds since Dec 31 1989 UTC) is handled by the lib's .time() method usually,
  // or we pass Date objects.

  const startDate = new Date(data.startTime)
  const startFitTime = fitWriter.time(startDate)

  // 2. File ID Message (Required)
  fitWriter.writeMessage('file_id', {
    type: 'activity',
    manufacturer: 'development',
    product: 0,
    serial_number: 0x12345678,
    time_created: startFitTime,
  })

  // 3. User Profile Message
  fitWriter.writeMessage('user_profile', {
    weight: data.userWeight,
    age: data.userAge,
  })

  // 4. Session Message (Summary)
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

  // 4. Record Messages (Time Series)
  data.records.forEach((record) => {
    fitWriter.writeMessage('record', {
      timestamp: fitWriter.time(new Date(record.time)),
      heart_rate: record.hr,
    })
  })

  const dataView = fitWriter.finish()
  const bytes = new Uint8Array(
    dataView.buffer,
    dataView.byteOffset,
    dataView.byteLength
  )
  return new Blob([bytes], { type: 'application/octet-stream' })
}
