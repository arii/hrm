/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto'
import {
  WorkoutSessionStorage,
  WorkoutSessionData,
} from '../../../lib/workout-session-storage'
import { HeartRateZone, HR_ZONE_ORDER } from '../../../lib/shared/hr-zones'

const mockSessionData: WorkoutSessionData = {
  sessionId: 'test-session-1',
  startTime: Date.now(),
  endTime: null,
  status: 'running',
  hrHistory: [],
  timeInZones: Object.fromEntries(HR_ZONE_ORDER.map((z) => [z, 0])) as Record<
    HeartRateZone,
    number
  >,
  averageHr: 0,
  maxHr: 0,
  calorieHistory: [],
  totalCaloriesBurned: 0,
  userSettings: { age: 30, weight: 70, maxHr: 190 },
  lastSyncTime: 0,
  syncStatus: 'pending',
}

describe('WorkoutSessionStorage with fake-indexeddb', () => {
  let storage: WorkoutSessionStorage

  beforeEach(() => {
    storage = new WorkoutSessionStorage()
  })

  afterEach(async () => {
    // Clear the database after each test
    const sessions = await storage.getAllSessions()
    await Promise.all(sessions.map((s) => storage.deleteSession(s.sessionId)))
  })

  it('should save and retrieve a session', async () => {
    await storage.saveSession(mockSessionData)
    const session = await storage.getSession(mockSessionData.sessionId)
    expect(session).toEqual(mockSessionData)
  })

  it('should retrieve all sessions', async () => {
    await storage.saveSession(mockSessionData)
    const sessions = await storage.getAllSessions()
    expect(sessions).toEqual([mockSessionData])
  })

  it('should delete a session', async () => {
    await storage.saveSession(mockSessionData)
    await storage.deleteSession(mockSessionData.sessionId)
    const session = await storage.getSession(mockSessionData.sessionId)
    expect(session).toBeNull()
  })

  it('should get an incomplete session', async () => {
    const incompleteSession = {
      ...mockSessionData,
      status: 'paused' as const,
    }
    await storage.saveSession(incompleteSession)
    const session = await storage.getIncompleteSession()
    expect(session).toEqual(incompleteSession)
  })
})
