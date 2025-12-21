/**
 * @file Unit tests for the date utility functions.
 * @module tests/unit/lib/shared/utils/date.test
 */
import {
  toISO8601,
  toUnixTimestamp,
  nowAsISO,
  nowAsUnix,
} from '@/lib/shared/utils/date'

describe('lib/shared/utils/date.ts', () => {
  const MOCK_DATE_STRING = '2023-10-27T10:00:00.000Z'
  const MOCK_TIMESTAMP = new Date(MOCK_DATE_STRING).getTime()

  // Use fake timers to control the system clock
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(MOCK_DATE_STRING))
  })

  // Restore real timers after all tests are done
  afterAll(() => {
    jest.useRealTimers()
  })

  describe('toISO8601', () => {
    it('should convert a Date object to an ISO 8601 string', () => {
      const date = new Date(MOCK_TIMESTAMP)
      expect(toISO8601(date)).toBe(MOCK_DATE_STRING)
    })

    it('should convert a Unix timestamp to an ISO 8601 string', () => {
      expect(toISO8601(MOCK_TIMESTAMP)).toBe(MOCK_DATE_STRING)
    })
  })

  describe('toUnixTimestamp', () => {
    it('should convert an ISO 8601 string to a Unix timestamp', () => {
      expect(toUnixTimestamp(MOCK_DATE_STRING)).toBe(MOCK_TIMESTAMP)
    })
  })

  describe('nowAsISO', () => {
    it('should return the current time as an ISO 8601 string', () => {
      expect(nowAsISO()).toBe(MOCK_DATE_STRING)
    })
  })

  describe('nowAsUnix', () => {
    it('should return the current time as a Unix timestamp', () => {
      expect(nowAsUnix()).toBe(MOCK_TIMESTAMP)
    })
  })
})
