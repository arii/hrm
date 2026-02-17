/**
 * @jest-environment jsdom
 */
import { generateFIT } from '@/services/exportService'
import { WorkoutSessionData } from '@/lib/workout-session-storage'

// Mock the Garmin SDK
jest.mock('@garmin/fitsdk', () => {
  return {
    Encoder: jest.fn().mockImplementation(() => {
      return {
        writeMesg: jest.fn(),
        close: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      }
    }),
    Profile: {
      MesgNum: {
        FILE_ID: 0,
        SESSION: 18,
        RECORD: 20,
      },
    },
  }
})

describe('exportService', () => {
  it('should generate a Blob of correct type', () => {
    const session: WorkoutSessionData = {
      sessionId: 'test-session',
      startTime: 1000000,
      endTime: 1000060,
      averageHr: 150,
      maxHr: 180,
      totalCaloriesBurned: 50,
      hrHistory: [
        { time: 1000000, hr: 140 },
        { time: 1000030, hr: 160 },
      ],
    } as unknown as WorkoutSessionData

    const blob = generateFIT(session)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect(blob.size).toBeGreaterThan(0)
  })
})
