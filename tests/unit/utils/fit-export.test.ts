import { generateFitFile } from '@/utils/fit-export'
import { Encoder } from '@garmin/fitsdk'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

jest.mock('@garmin/fitsdk')

describe('generateFitFile', () => {
  let writeMesgMock: jest.Mock
  let closeMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    writeMesgMock = jest.fn()
    closeMock = jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
    ;(Encoder as unknown as jest.Mock).mockImplementation(() => {
      return {
        writeMesg: writeMesgMock,
        close: closeMock,
      }
    })
  })

  it('should generate a FIT file blob and write messages in correct order', () => {
    const session: WorkoutSessionData = {
      sessionId: 'test-session',
      startTime: 1700000000000,
      endTime: 1700000060000,
      status: 'finished',
      hrHistory: [
        { time: 1700000000000, hr: 60 },
        { time: 1700000030000, hr: 120 },
      ],
      timeInZones: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      averageHr: 90,
      maxHr: 120,
      calorieHistory: [],
      totalCaloriesBurned: 100,
      userSettings: { age: 30, weight: 70, maxHr: 190 },
      lastSyncTime: 0,
      syncStatus: 'synced',
    }

    // Garmin Epoch: 631065600000
    // 1700000000000 - 631065600000 = 1068934400000 -> 1068934400
    // 1700000060000 - 631065600000 = 1068934460000 -> 1068934460

    const mockTimestamp = 1700000060000
    const blob = generateFitFile(session, mockTimestamp)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/fit')

    expect(writeMesgMock).toHaveBeenCalledTimes(4)

    expect(writeMesgMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        mesgNum: 0,
        type: 4,
        manufacturer: 255,
        timeCreated: 1068934400,
      })
    )

    expect(writeMesgMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        mesgNum: 20,
        heartRate: 60,
        timestamp: 1068934400,
      })
    )
    expect(writeMesgMock.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        mesgNum: 20,
        heartRate: 120,
        timestamp: 1068934430,
      })
    )

    expect(writeMesgMock.mock.calls[3][0]).toEqual(
      expect.objectContaining({
        mesgNum: 18,
        totalTimerTime: 60,
        totalCalories: 100,
        avgHeartRate: 90,
        maxHeartRate: 120,
        timestamp: 1068934460,
        startTime: 1068934400,
      })
    )
  })

  it('should handle session without endTime', () => {
    const session: WorkoutSessionData = {
      sessionId: 'test-session-running',
      startTime: 1700000000000,
      endTime: null,
      status: 'running',
      hrHistory: [],
      timeInZones: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      averageHr: 0,
      maxHr: 0,
      calorieHistory: [],
      totalCaloriesBurned: 0,
      userSettings: { age: 30, weight: 70, maxHr: 190 },
      lastSyncTime: 0,
      syncStatus: 'synced',
    }

    // 1700000010000 - 631065600000 = 1068934410000 -> 1068934410
    const mockTimestamp = 1700000010000
    generateFitFile(session, mockTimestamp)

    const lastCallArg =
      writeMesgMock.mock.calls[writeMesgMock.mock.calls.length - 1][0]

    expect(lastCallArg).toEqual(
      expect.objectContaining({
        mesgNum: 18,
        totalTimerTime: 10,
        timestamp: 1068934410,
        startTime: 1068934400,
      })
    )
  })
})
