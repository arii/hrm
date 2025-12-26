// tests/unit/services/hrmDataService.test.ts
import { hrmDataService } from '../../../services/hrmDataService'
import { db } from '../../../services/database'
import { Session, Measurement } from '../../../types/hrm'

// Since we are using a mock for 'better-sqlite3', we can access the mock
// database instance and its methods to assert that they are called correctly.
const mockDb = db as any

describe('HrmDataService', () => {
  afterEach(() => {
    // Clear all mock call history between tests
    jest.clearAllMocks()
  })

  describe('startSession', () => {
    it('should insert a new session into the database and return a session ID', () => {
      const sessionData = {
        userName: 'Test User',
        deviceId: 'test-device-123',
      }
      const sessionId = hrmDataService.startSession(sessionData)

      expect(sessionId).toBeDefined()
      expect(typeof sessionId).toBe('string')
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sessions'))
      expect(mockDb.prepare().run).toHaveBeenCalledWith(
        expect.any(String),
        sessionData.userName,
        expect.any(Number),
        sessionData.deviceId
      )
    })
  })

  describe('logMeasurement', () => {
    it('should insert a new measurement into the database', () => {
      const measurement: Omit<Measurement, 'sessionId'> = {
        timestamp: Date.now(),
        bpm: 120,
        caloriesAccumulated: 50,
        zoneLabel: 'Cardio',
      }
      const sessionId = 'test-session-id'
      hrmDataService.logMeasurement(measurement, sessionId)

      expect(mockDb.prepare().run).toHaveBeenCalledWith(
        sessionId,
        measurement.timestamp,
        measurement.bpm,
        measurement.caloriesAccumulated,
        measurement.zoneLabel
      )
    })
  })

  describe('endSession', () => {
    it('should update a session with end time, average BPM, and total calories', () => {
      const sessionId = 'test-session-id'
      const endTime = Date.now()
      const avgBpm = 130
      const totalCalories = 200
      hrmDataService.endSession(sessionId, endTime, avgBpm, totalCalories)

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE sessions'))
      expect(mockDb.prepare().run).toHaveBeenCalledWith(endTime, avgBpm, totalCalories, sessionId)
    })
  })

  describe('getSessionHistory', () => {
    it('should retrieve a list of recent sessions', () => {
      const mockSessions: Session[] = [
        { id: '1', userName: 'User1', startTime: Date.now(), deviceId: 'd1' },
        { id: '2', userName: 'User2', startTime: Date.now() - 1000, deviceId: 'd2' },
      ]
      mockDb.prepare().all.mockReturnValue(mockSessions)

      const sessions = hrmDataService.getSessionHistory(2)

      expect(sessions).toEqual(mockSessions)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
      expect(mockDb.prepare().all).toHaveBeenCalledWith(2)
    })
  })

  describe('getSessionDetails', () => {
    it('should retrieve the details of a specific session with its measurements', () => {
      const mockSession: Session = {
        id: '1',
        userName: 'User1',
        startTime: Date.now(),
        deviceId: 'd1',
      }
      const mockMeasurements: Measurement[] = [
        { sessionId: '1', timestamp: Date.now(), bpm: 120, caloriesAccumulated: 10, zoneLabel: 'Cardio' },
      ]
      mockDb.prepare().get.mockReturnValue(mockSession)
      mockDb.prepare().all.mockReturnValue(mockMeasurements)

      const sessionDetails = hrmDataService.getSessionDetails('1')

      expect(sessionDetails).toEqual({ ...mockSession, measurements: mockMeasurements })
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM sessions'))
      expect(mockDb.prepare().get).toHaveBeenCalledWith('1')
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM measurements'))
      expect(mockDb.prepare().all).toHaveBeenCalledWith('1')
    })

    it('should return undefined if the session is not found', () => {
      mockDb.prepare().get.mockReturnValue(undefined)
      const sessionDetails = hrmDataService.getSessionDetails('not-found')
      expect(sessionDetails).toBeUndefined()
    })
  })

  describe('pruneOldData', () => {
    it('should delete sessions older than 30 days', () => {
      mockDb.prepare().run.mockReturnValue({ changes: 5 })
      hrmDataService.pruneOldData()

      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM sessions WHERE start_time < ?')
      expect(mockDb.prepare().run).toHaveBeenCalledWith(expect.any(Number))
    })
  })

  describe('updateSessionMetadata', () => {
    it('should update the user name of a session', () => {
      const sessionId = 'test-session-id'
      const newUserName = 'New User Name'
      hrmDataService.updateSessionMetadata(sessionId, newUserName)

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE sessions'))
      expect(mockDb.prepare().run).toHaveBeenCalledWith(newUserName, sessionId)
    })
  })
})
