import { FitWriter } from '@markw65/fit-file-writer'

interface FitExportData {
  startTime: number // ms timestamp
  durationSeconds: number
  totalCalories: number
  records: Array<{
    time: number // ms timestamp
    hr: number
  }>
  userAge?: number
  userWeight?: number
  gender?: 'male' | 'female'
}

export const generateFitFile = (data: FitExportData): Blob => {
  const fitWriter = new FitWriter()

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
  return new Blob([bytes.buffer], { type: 'application/octet-stream' })
}
