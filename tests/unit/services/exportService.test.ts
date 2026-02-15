import { generateGPX, generateFIT } from '@/services/exportService'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Mock @garmin/fitsdk because it's an ESM module that Jest has trouble with
jest.mock('@garmin/fitsdk', () => {
  return {
    Encoder: class {
      writeMesg = jest.fn()
      close = jest.fn(
        () => new Uint8Array([14, 0, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54])
      )
    },
    Profile: {
      MesgNum: {
        FILE_ID: 0,
        SESSION: 18,
        RECORD: 20,
      },
      types: {
        file: { ACTIVITY: 4 },
        manufacturer: { DEVELOPMENT: 255 },
        sport: { GENERIC: 0 },
      },
    },
    Stream: class {},
  }
})

describe('exportService', () => {
  const mockSession: WorkoutSessionData = {
    sessionId: 'test-session-id',
    startTime: 1600000000000,
    endTime: 1600003600000,
    status: 'finished',
    hrHistory: [
      { time: 1600000000000, hr: 70 },
      { time: 1600001800000, hr: 120 },
      { time: 1600003600000, hr: 80 },
    ],
    timeInZones: {
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
      ZONE_6: 0,
    },
    averageHr: 90,
    maxHr: 120,
    calorieHistory: [],
    totalCaloriesBurned: 500,
    userSettings: { age: 30, weight: 70, maxHr: 190 },
    lastSyncTime: 1600003600000,
    syncStatus: 'synced',
  }

  describe('generateGPX', () => {
    it('should generate a valid GPX string', () => {
      const gpx = generateGPX(mockSession)
      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(gpx).toContain('<gpx')
      expect(gpx).toContain('<trkpt lat="0.0" lon="0.0">')
      expect(gpx).toContain('<gpxtpx:hr>70</gpxtpx:hr>')
      expect(gpx).toContain('<gpxtpx:hr>120</gpxtpx:hr>')
      expect(gpx).toContain('<gpxtpx:hr>80</gpxtpx:hr>')
      expect(gpx).toContain('<name>Workout test-session-id</name>')
    })
  })

  describe('generateFIT', () => {
    it('should generate a FIT Buffer', () => {
      const fitBuffer = generateFIT(mockSession)
      expect(fitBuffer).toBeInstanceOf(Buffer)
      expect(fitBuffer.length).toBeGreaterThan(0)
      // FIT file starts with a header, first byte is header size (usually 12 or 14)
      expect(fitBuffer[0]).toBe(14)
      // Check for ".FIT" string in header
      expect(fitBuffer.toString('ascii', 8, 12)).toBe('.FIT')
    })
  })
})
