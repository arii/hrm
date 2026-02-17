import { generateFIT } from '@/services/exportService'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import { Encoder, Profile } from '@garmin/fitsdk'

// Mock @garmin/fitsdk because it's an ESM module that Jest has trouble with
// Also mocking it avoids actual binary generation logic which is complex
jest.mock('@garmin/fitsdk', () => {
  const writeMesg = jest.fn()
  const close = jest.fn(
    () => new Uint8Array([14, 0, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54])
  )
  return {
    Encoder: jest.fn().mockImplementation(() => ({
      writeMesg,
      close,
    })),
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

  describe('generateFIT', () => {
    it('should generate a FIT Blob and write correct messages', () => {
      const fitBlob = generateFIT(mockSession)

      const encoderInstance = (Encoder as jest.Mock).mock.results[0].value
      const writeMesg = encoderInstance.writeMesg

      // Should write FILE_ID
      expect(writeMesg).toHaveBeenCalledWith(
        expect.objectContaining({
          mesgNum: Profile.MesgNum.FILE_ID,
          type: Profile.types.file.ACTIVITY,
        })
      )

      // Should write SESSION
      expect(writeMesg).toHaveBeenCalledWith(
        expect.objectContaining({
          mesgNum: Profile.MesgNum.SESSION,
          avgHeartRate: 90,
          maxHeartRate: 120,
          totalCalories: 500,
        })
      )

      // Should write RECORD messages (3 data points)
      expect(writeMesg).toHaveBeenCalledWith(
        expect.objectContaining({
          mesgNum: Profile.MesgNum.RECORD,
          heartRate: 70,
        })
      )
      expect(writeMesg).toHaveBeenCalledWith(
        expect.objectContaining({
          mesgNum: Profile.MesgNum.RECORD,
          heartRate: 120,
        })
      )
      expect(writeMesg).toHaveBeenCalledWith(
        expect.objectContaining({
          mesgNum: Profile.MesgNum.RECORD,
          heartRate: 80,
        })
      )

      expect(fitBlob).toBeInstanceOf(Blob)
      expect(fitBlob.type).toBe('application/vnd.ant.fit')
      // Note: Checking blob content synchronously is hard in Jest without specialized matchers
      // or async arrayBuffer(), but instance check confirms the change.
    })
  })
})
