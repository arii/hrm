/**
 * @jest-environment jsdom
 */
// tests/unit/lib/workout-session-storage.test.ts

import 'fake-indexeddb/auto'
import { WorkoutSessionStorage, WorkoutSessionData } from '../../../lib/workout-session-storage'

describe('WorkoutSessionStorage', () => {
  let storage: WorkoutSessionStorage

  beforeEach(() => {
    storage = new WorkoutSessionStorage()
  })

  afterEach(async () => {
    const allSessions = await storage.getAllSessions()
    for (const session of allSessions) {
      await storage.deleteSession(session.sessionId)
    }
  })

  const createMockSession = (sessionId: string, status: 'running' | 'paused' | 'finished'): WorkoutSessionData => ({
    sessionId,
    startTime: Date.now(),
    endTime: null,
    status,
    hrHistory: [],
    timeInZones: { 'Zone 1': 0, 'Zone 2': 0, 'Zone 3': 0, 'Zone 4': 0, 'Zone 5': 0 },
    averageHr: 0,
    maxHr: 0,
    calorieHistory: [],
    totalCaloriesBurned: 0,
    userSettings: { age: 30, weight: 70 },
    lastSyncTime: Date.now(),
    syncStatus: 'pending',
  })

  it('should save and retrieve a session', async () => {
    const session = createMockSession('session-1', 'running')
    await storage.saveSession(session)
    const retrievedSession = await storage.getSession('session-1')
    expect(retrievedSession).toEqual(session)
  })

  it('should return null for a non-existent session', async () => {
    const retrievedSession = await storage.getSession('non-existent')
    expect(retrievedSession).toBeNull()
  })

  it('should retrieve all sessions', async () => {
    const session1 = createMockSession('session-1', 'running')
    const session2 = createMockSession('session-2', 'finished')
    await storage.saveSession(session1)
    await storage.saveSession(session2)
    const allSessions = await storage.getAllSessions()
    expect(allSessions).toHaveLength(2)
    expect(allSessions).toContainEqual(session1)
    expect(allSessions).toContainEqual(session2)
  })

  it('should delete a session', async () => {
    const session = createMockSession('session-1', 'running')
    await storage.saveSession(session)
    await storage.deleteSession('session-1')
    const retrievedSession = await storage.getSession('session-1')
    expect(retrievedSession).toBeNull()
  })

  it('should get an incomplete session if one is running', async () => {
    const runningSession = createMockSession('session-1', 'running')
    const finishedSession = createMockSession('session-2', 'finished')
    await storage.saveSession(runningSession)
    await storage.saveSession(finishedSession)
    const incompleteSession = await storage.getIncompleteSession()
    expect(incompleteSession).toEqual(runningSession)
  })

  it('should get an incomplete session if one is paused', async () => {
    const pausedSession = createMockSession('session-1', 'paused')
    const finishedSession = createMockSession('session-2', 'finished')
    await storage.saveSession(pausedSession)
    await storage.saveSession(finishedSession)
    const incompleteSession = await storage.getIncompleteSession()
    expect(incompleteSession).toEqual(pausedSession)
  })

  it('should return null if no incomplete sessions exist', async () => {
    const finishedSession = createMockSession('session-1', 'finished')
    await storage.saveSession(finishedSession)
    const incompleteSession = await storage.getIncompleteSession()
    expect(incompleteSession).toBeNull()
  })
})

describe('WorkoutSessionStorage with localStorage fallback', () => {
  let storage: WorkoutSessionStorage

  beforeAll(() => {
    // @ts-ignore
    delete window.indexedDB
  })

  beforeEach(() => {
    storage = new WorkoutSessionStorage()
    localStorage.clear()
  })

  const createMockSession = (sessionId: string, status: 'running' | 'paused' | 'finished'): WorkoutSessionData => ({
    sessionId,
    startTime: Date.now(),
    endTime: null,
    status,
    hrHistory: [],
    timeInZones: { 'Zone 1': 0, 'Zone 2': 0, 'Zone 3': 0, 'Zone 4': 0, 'Zone 5': 0 },
    averageHr: 0,
    maxHr: 0,
    calorieHistory: [],
    totalCaloriesBurned: 0,
    userSettings: { age: 30, weight: 70 },
    lastSyncTime: Date.now(),
    syncStatus: 'pending',
  })

  it('should save and retrieve a session using localStorage', async () => {
    const session = createMockSession('session-1', 'running')
    await storage.saveSession(session)
    const retrievedSession = await storage.getSession('session-1')
    expect(retrievedSession).toEqual(session)
  })

  it('should retrieve all sessions from localStorage', async () => {
    const session1 = createMockSession('session-1', 'running')
    const session2 = createMockSession('session-2', 'finished')
    await storage.saveSession(session1)
    await storage.saveSession(session2)
    const allSessions = await storage.getAllSessions()
    expect(allSessions).toHaveLength(2)
    expect(allSessions).toContainEqual(session1)
    expect(allSessions).toContainEqual(session2)
  })

  it('should delete a session from localStorage', async () => {
    const session = createMockSession('session-1', 'running')
    await storage.saveSession(session)
    await storage.deleteSession('session-1')
    const retrievedSession = await storage.getSession('session-1')
    expect(retrievedSession).toBeNull()
  })

  it('should get an incomplete session from localStorage', async () => {
    const runningSession = createMockSession('session-1', 'running')
    const finishedSession = createMockSession('session-2', 'finished')
    await storage.saveSession(runningSession)
    await storage.saveSession(finishedSession)
    const incompleteSession = await storage.getIncompleteSession()
    expect(incompleteSession).toEqual(runningSession)
  })
})
