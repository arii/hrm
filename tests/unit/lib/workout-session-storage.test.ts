/**
 * @jest-environment jsdom
 */
import { openDB } from 'idb'
import {
  WorkoutSessionStorage,
  WorkoutSessionData,
} from '../../../lib/workout-session-storage'

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
    Zone1: 0,
    Zone2: 0,
    Zone3: 0,
    Zone4: 0,
    Zone5: 0,
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
  const mockDb = {
    put: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(() => ({
      store: {
        index: jest.fn(() => ({
          get: jest.fn(),
        })),
      },
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(openDB as jest.Mock).mockResolvedValue(mockDb)
    storage = new WorkoutSessionStorage()
  })

  describe('with IndexedDB available', () => {
    it('should save and retrieve a session using IndexedDB', async () => {
      mockDb.get.mockResolvedValue(mockSessionData)
      await storage.saveSession(mockSessionData)
      expect(mockDb.put).toHaveBeenCalledWith('sessions', mockSessionData)
      const session = await storage.getSession(mockSessionData.sessionId)
      expect(session).toEqual(mockSessionData)
    })

    it('should retrieve all sessions using IndexedDB', async () => {
      mockDb.getAll.mockResolvedValue([mockSessionData])
      const sessions = await storage.getAllSessions()
      expect(sessions).toEqual([mockSessionData])
    })

    it('should delete a session using IndexedDB', async () => {
      await storage.deleteSession(mockSessionData.sessionId)
      expect(mockDb.delete).toHaveBeenCalledWith(
        'sessions',
        mockSessionData.sessionId
      )
    })

    it('should get an incomplete session using IndexedDB', async () => {
      const incompleteSession = { ...mockSessionData, status: 'running' }
      const index = { get: jest.fn() }
      index.get.mockResolvedValueOnce(incompleteSession)
      mockDb.transaction.mockReturnValue({
        store: { index: () => index },
      })
      const session = await storage.getIncompleteSession()
      expect(session).toEqual(incompleteSession)
    })
  })

  describe('with IndexedDB failure (localStorage fallback)', () => {
    beforeEach(() => {
      ;(openDB as jest.Mock).mockRejectedValue(new Error('IndexedDB failed'))
      storage = new WorkoutSessionStorage()
      // Mock localStorage
      let store: { [key: string]: string } = {}
      global.Storage.prototype.setItem = jest.fn((key, value) => {
        store[key] = value
      })
      global.Storage.prototype.getItem = jest.fn((key) => store[key])
      global.Storage.prototype.removeItem = jest.fn((key) => {
        delete store[key]
      })
      global.Storage.prototype.clear = jest.fn(() => {
        store = {}
      })
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
