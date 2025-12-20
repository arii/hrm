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
  const RealDate = Date

  // Helper to mock the Date object to a fixed value
  const mockDate = (isoDate: string) => {
    // @ts-expect-error - Mocking the global Date object for testing purposes
    global.Date = class extends RealDate {
      constructor(dateString?: string | number | Date) {
        // If a date string is provided, use it; otherwise, use the mock date.
        super(dateString || isoDate)
      }

      static now() {
        // Mock static `now()` to return the timestamp of our mock date
        return new RealDate(isoDate).getTime()
      }
    }
  }

  // Restore the real Date object after each test to ensure isolation
  afterEach(() => {
    global.Date = RealDate
  })

  // Group tests that require the mocked date
  describe('with mocked date', () => {
    beforeEach(() => {
      mockDate(MOCK_DATE_STRING)
    })

    describe('toISO8601', () => {
      it('should convert a Date object to an ISO 8601 string', () => {
        const date = new RealDate(MOCK_TIMESTAMP)
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
        // `new Date()` inside the function will now use our mocked constructor
        expect(nowAsISO()).toBe(MOCK_DATE_STRING)
      })
    })

    describe('nowAsUnix', () => {
      it('should return the current time as a Unix timestamp', () => {
        // `Date.now()` will now use our mocked static method
        expect(nowAsUnix()).toBe(MOCK_TIMESTAMP)
      })
    })
  })
})
