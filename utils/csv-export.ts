// utils/csv-export.ts
import { WorkoutSessionData } from '@/lib/workout-session-storage'

/**
 * Generate a plain-CSV export of a workout session (#9078).
 * One row per heart-rate sample; the calories column forward-fills the
 * latest known cumulative total (empty when no calorie sample precedes it).
 */
export function generateCsvExport(session: WorkoutSessionData): Blob {
  const lines = ['timestamp_iso,elapsed_seconds,heart_rate_bpm,calories_total']
  // Calorie samples are chronological; walk once with a monotonic cursor.
  const calories = [...session.calorieHistory].sort((a, b) => a.time - b.time)
  let cursor = 0
  let latestTotal = ''

  for (const point of session.hrHistory) {
    let sample = calories[cursor]
    while (sample !== undefined && sample.time <= point.time) {
      latestTotal = String(sample.totalToThisPoint)
      cursor += 1
      sample = calories[cursor]
    }
    const elapsed = ((point.time - session.startTime) / 1000).toFixed(1)
    lines.push(
      `${new Date(point.time).toISOString()},${elapsed},${point.hr},${latestTotal}`
    )
  }

  return new Blob([lines.join('\n') + '\n'], { type: 'text/csv' })
}
