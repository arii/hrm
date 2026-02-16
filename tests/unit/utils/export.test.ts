/**
 * @jest-environment jsdom
 */
import { convertToCSV, convertToGPX } from '@/utils/export'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

describe('export utils', () => {
  const mockSession: WorkoutSessionData = {
    sessionId: 'test-session-id',
    startTime: 1600000000000,
    endTime: 1600003600000,
    status: 'finished',
    hrHistory: [
      { time: 1600000000000, hr: 70, calories: 0.1 },
      { time: 1600000010000, hr: 75, calories: 0.2 },
    ],
    timeInZones: {
      Idle: 0,
      Recovery: 0,
      'Warm Up': 0,
      'Fat Burn': 0,
      Cardio: 0,
      Peak: 0,
      Max: 0,
      'No Data': 0,
      Unknown: 0,
      Aerobic: 0,
    },
    averageHr: 72.5,
    maxHr: 75,
    calorieHistory: [],
    totalCaloriesBurned: 0.3,
    userSettings: { age: 30, weight: 70, maxHr: 190 },
    lastSyncTime: 0,
    syncStatus: 'pending',
  }

  describe('convertToCSV', () => {
    it('converts session history to CSV string', () => {
      const csv = convertToCSV(mockSession)
      expect(csv).toContain('Timestamp,Heart Rate (BPM),Total Calories')
      expect(csv).toContain('2020-09-13T12:26:40.000Z,70,0.10')
      expect(csv).toContain('2020-09-13T12:26:50.000Z,75,0.20')
    })

    it('handles missing calories', () => {
      const sessionWithoutCalories: WorkoutSessionData = {
        ...mockSession,
        hrHistory: [{ time: 1600000000000, hr: 70 }],
      }
      const csv = convertToCSV(sessionWithoutCalories)
      expect(csv).toContain('2020-09-13T12:26:40.000Z,70,')
    })
  })

  describe('convertToGPX', () => {
    it('converts session history to valid GPX string with Garmin extensions', () => {
      const gpx = convertToGPX(mockSession)
      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(gpx).toContain('<gpx')
      expect(gpx).toContain(
        'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"'
      )
      expect(gpx).toContain('<trkpt lat="0.0" lon="0.0">')
      expect(gpx).toContain('<gpxtpx:hr>70</gpxtpx:hr>')
      expect(gpx).toContain('<gpxtpx:hr>75</gpxtpx:hr>')
    })
  })
})
