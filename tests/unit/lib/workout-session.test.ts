// tests/unit/lib/workout-session.test.ts
import { isSessionStale } from '../../../lib/workout-session'
import { WorkoutSessionData } from '../../../lib/workout-session-storage'
import { HeartRateZone } from '../../../lib/shared/hr-zones'

describe('isSessionStale', () => {
  it('should return true for a session from a previous day', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const staleSession: WorkoutSessionData = {
      sessionId: 'stale-session-id',
      startTime: yesterday.getTime(),
      status: 'running',
      hrHistory: [],
      timeInZones: {} as Record<HeartRateZone, number>,
      averageHr: 0,
      maxHr: 0,
      calorieHistory: [],
      totalCaloriesBurned: 0,
      userSettings: { age: 30, weightKg: 80, maxHr: 190 },
      lastSyncTime: yesterday.getTime(),
      syncStatus: 'pending',
      endTime: null,
    }

    expect(isSessionStale(staleSession)).toBe(true)
  })

  it('should return false for a session from the same day', () => {
    const todaySession: WorkoutSessionData = {
      sessionId: 'today-session-id',
      startTime: new Date().getTime(),
      status: 'paused',
      hrHistory: [],
      timeInZones: {} as Record<HeartRateZone, number>,
      averageHr: 0,
      maxHr: 0,
      calorieHistory: [],
      totalCaloriesBurned: 0,
      userSettings: { age: 30, weightKg: 80, maxHr: 190 },
      lastSyncTime: new Date().getTime(),
      syncStatus: 'pending',
      endTime: null,
    }

    expect(isSessionStale(todaySession)).toBe(false)
  })
})
