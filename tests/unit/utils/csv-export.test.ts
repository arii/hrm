/**
 * @jest-environment jsdom
 */
import { generateCsvExport } from '@/utils/csv-export'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// jsdom's Blob predates .text(); FileReader works everywhere.
const blobText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

const baseSession: WorkoutSessionData = {
  sessionId: 'test-session',
  startTime: 1700000000000,
  endTime: 1700000060000,
  status: 'finished',
  hrHistory: [],
  timeInZones: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  averageHr: 90,
  maxHr: 120,
  calorieHistory: [],
  totalCaloriesBurned: 100,
  userSettings: { age: 30, weight: 70, maxHr: 190 },
  lastSyncTime: 0,
  syncStatus: 'synced',
}

describe('generateCsvExport (#9078)', () => {
  it('emits a header plus one row per HR sample', async () => {
    const session: WorkoutSessionData = {
      ...baseSession,
      hrHistory: [
        { time: 1700000000000, hr: 60 },
        { time: 1700000030000, hr: 120 },
      ],
    }
    const text = await blobText(generateCsvExport(session))
    const lines = text.trim().split('\n')
    expect(lines[0]).toBe(
      'timestamp_iso,elapsed_seconds,heart_rate_bpm,calories_total'
    )
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('2023-11-14T22:13:20.000Z,0.0,60,')
    expect(lines[2]).toBe('2023-11-14T22:13:50.000Z,30.0,120,')
  })

  it('forward-fills the latest cumulative calorie total', async () => {
    const session: WorkoutSessionData = {
      ...baseSession,
      hrHistory: [
        { time: 1700000000000, hr: 60 },
        { time: 1700000020000, hr: 100 },
        { time: 1700000040000, hr: 110 },
      ],
      calorieHistory: [
        {
          time: 1700000010000,
          hr: 80,
          caloriesPerSecond: 0.1,
          totalToThisPoint: 5,
        },
        {
          time: 1700000030000,
          hr: 105,
          caloriesPerSecond: 0.2,
          totalToThisPoint: 12,
        },
      ],
    }
    const text = await blobText(generateCsvExport(session))
    const lines = text.trim().split('\n')
    // No calorie sample precedes the first HR sample: empty cell.
    expect(lines[1].endsWith(',60,')).toBe(true)
    // 5 (t=10s) applies at t=20s; 12 (t=30s) applies at t=40s.
    expect(lines[2].endsWith(',100,5')).toBe(true)
    expect(lines[3].endsWith(',110,12')).toBe(true)
  })

  it('emits only the header when there are no HR samples', async () => {
    const text = await blobText(generateCsvExport(baseSession))
    expect(text.trim()).toBe(
      'timestamp_iso,elapsed_seconds,heart_rate_bpm,calories_total'
    )
  })
})
