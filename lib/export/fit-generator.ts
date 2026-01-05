import { FitWriter } from '@markw65/fit-file-writer';

interface FitExportData {
  startTime: number; // ms timestamp
  durationSeconds: number;
  totalCalories: number;
  records: Array<{
    time: number; // ms timestamp
    hr: number;
  }>;
}

export const generateFitFile = (data: FitExportData): Blob => {
  const fitWriter = new FitWriter({ speedUnit: 'm/s' });

  const startDate = new Date(data.startTime);
  const startFitTime = fitWriter.time(startDate);

  // 1. File ID Message (Required)
  fitWriter.writeMessage('file_id', {
    type: 'activity',
    manufacturer: 'development',
    product: 0,
    serial_number: 0x12345678,
    time_created: startFitTime,
  });

  // 2. Session Message (Summary)
  fitWriter.writeMessage('session', {
    start_time: startFitTime,
    total_elapsed_time: data.durationSeconds,
    total_timer_time: data.durationSeconds,
    total_calories: Math.round(data.totalCalories),
    sport: 'generic',
    sub_sport: 'generic',
    timestamp: fitWriter.time(new Date(data.startTime + data.durationSeconds * 1000)),
  });

  // 3. Record Messages (Time Series)
  data.records.forEach((record) => {
    fitWriter.writeMessage('record', {
      timestamp: fitWriter.time(new Date(record.time)),
      heart_rate: record.hr,
    });
  });

  const bytes = fitWriter.finish();
  return new Blob([bytes], { type: 'application/octet-stream' });
};
