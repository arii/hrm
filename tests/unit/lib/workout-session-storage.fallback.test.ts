/**
 * @jest-environment jsdom
 */
import { openDB } from 'idb'
import {
  WorkoutSessionStorage,
  WorkoutSessionData,
} from '../../../lib/workout-session-storage'
import { HrZoneName } from '../../../lib/shared/hr-zones'

jest.mock('idb', () => ({
  openDB: jest.fn(() => ({
    catch: jest.fn(),
  })),
}))

const mockSessionData: WorkoutSessionData = {
  sessionId: 'test-session-1',
  startTime: Date.now(),
  endTime: null,
  status: 'running',
  hrHistory: [],
  timeInZones: {
    [HrZoneName.WarmUp]: 0,
    [HrZoneName.FatBurn]: 0,
    [HrZoneName.Cardio]: 0,
    [HrZoneName.Peak]: 0,
    [HrZoneName.Max]: 0,
    [HrZoneName.NoData]: 0,
    [HrZoneName.Unknown]: 0,
  },
  averageHr: 0,
  maxHr: 0,
  calorieHistory: [],
  totalCaloriesBurned: 0,
  userSettings: { age: 30, weight: 70, maxHr: 190 },
  lastSyncTime: 0,
  syncStatus: 'pending',
}

describe('WorkoutSessionStorage', () => {
  let storage: WorkoutSessionStorage

  describe('with IndexedDB failure (localStorage fallback)', () => {
    beforeEach(() => {
      ;(openDB as jest.Mock).mockRejectedValue(new Error('IndexedDB failed'))
      storage = new WorkoutSessionStorage()
      localStorage.clear()
    })

    it('should save and retrieve a session using localStorage', async () => {
      await storage.saveSession(mockSessionData)
      const session = await storage.getSession(mockSessionData.sessionId)
      expect(session).toEqual(mockSessionData)
    })

    it('should retrieve all sessions using localStorage', async () => {
      await storage.saveSession(mockSessionData)
      const sessions = await storage.getAllSessions()
      expect(sessions).toEqual([mockSessionData])
    })

    it('should delete a session using localStorage', async () => {
      await storage.saveSession(mockSessionData)
      await storage.deleteSession(mockSessionData.sessionId)
      const session = await storage.getSession(mockSessionData.sessionId)
      expect(session).toBeNull()
    })

    it('should get an incomplete session using localStorage', async () => {
      const incompleteSession = { ...mockSessionData, status: 'paused' }
      await storage.saveSession(incompleteSession)
      const session = await storage.getIncompleteSession()
      expect(session).toEqual(incompleteSession)
    })
  })
})
