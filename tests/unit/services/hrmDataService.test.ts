/**
 * @jest-environment-node
 */
import { initDb } from '@/lib/db.js'
import { WorkoutSession } from '@/types/workout.js'
import db from '@/lib/db.js'

let hrmDataService: {
  saveWorkoutSession: (
    session: WorkoutSession & { userId: string }
  ) => Promise<void>
  getSessionDetails: (
    id: string,
    userId: string
  ) => Promise<WorkoutSession | null>
  getSessionHistory: (userId: string) => Promise<WorkoutSession[]>
  cleanupOldSessions: () => void
}

beforeAll(async () => {
  // Initialize the in-memory database for tests before importing the service
  initDb()
  // Dynamically import the service after the database is initialized
  hrmDataService = await import('@/services/hrmDataService.js')
})

// Clear the database after each test
afterEach(() => {
  db.exec('DELETE FROM workout_sessions')
})

describe('hrmDataService', () => {
  const userId = 'test-user'
  const session: WorkoutSession & { userId: string } = {
    id: 'test-session-1',
    userId,
    date: new Date().toISOString(),
    name: 'Test Workout',
    duration: 1800,
    avgHr: 150,
    maxHr: 180,
  }

  test('should save and retrieve a workout session', async () => {
    await hrmDataService.saveWorkoutSession(session)
    const retrievedSession = await hrmDataService.getSessionDetails(
      session.id,
      userId
    )
    expect(retrievedSession).toEqual(
      expect.objectContaining({
        id: session.id,
        name: session.name,
        duration: session.duration,
        avgHr: session.avgHr,
        maxHr: session.maxHr,
      })
    )
  })

  test('should return null for a non-existent session', async () => {
    const retrievedSession = await hrmDataService.getSessionDetails(
      'non-existent',
      userId
    )
    expect(retrievedSession).toBeNull()
  })

  test('should retrieve session history for a user', async () => {
    await hrmDataService.saveWorkoutSession(session)
    const history = await hrmDataService.getSessionHistory(userId)
    expect(history).toHaveLength(1)
    expect(history[0]).toEqual(
      expect.objectContaining({
        id: session.id,
        name: session.name,
      })
    )
  })

  test('should return an empty array for a user with no history', async () => {
    const history = await hrmDataService.getSessionHistory('no-history-user')
    expect(history).toHaveLength(0)
  })

  test('should clean up old sessions', async () => {
    const oldSession: WorkoutSession & { userId: string } = {
      ...session,
      id: 'old-session',
      date: new Date(0).toISOString(),
    }
    await hrmDataService.saveWorkoutSession(oldSession)

    // Manually set an old creation date for the test
    db.prepare(
      `UPDATE workout_sessions SET createdAt = datetime('now', '-100 days') WHERE id = 'old-session'`
    ).run()

    hrmDataService.cleanupOldSessions()

    const retrievedSession = await hrmDataService.getSessionDetails(
      oldSession.id,
      userId
    )
    expect(retrievedSession).toBeNull()
  })
})
