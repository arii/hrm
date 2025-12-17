/**
 * @file Unit tests for the date utility functions in `lib/core/date.ts`.
 * @jest-environment node
 */
import {
  toISO8601,
  toUnixTimestamp,
  nowAsISO,
  nowAsUnix,
} from '../../../../lib/core/date'

describe('lib/core/date.ts', () => {
  // Test for toISO8601
  describe('toISO8601', () => {
    it('should convert a Date object to an ISO 8601 string', () => {
      const date = new Date('2023-01-01T12:00:00.000Z')
      expect(toISO8601(date)).toBe('2023-01-01T12:00:00.000Z')
    })

    it('should convert a Unix timestamp (number) to an ISO 8601 string', () => {
      const timestamp = 1672574400000 // Corresponds to 2023-01-01T12:00:00.000Z
      expect(toISO8601(timestamp)).toBe('2023-01-01T12:00:00.000Z')
    })
  })

  // Test for toUnixTimestamp
  describe('toUnixTimestamp', () => {
    it('should convert an ISO 8601 string to a Unix timestamp', () => {
      const isoString = '2023-01-01T12:00:00.000Z'
      expect(toUnixTimestamp(isoString)).toBe(1672574400000)
    })
  })

  // Test for nowAsISO
  describe('nowAsISO', () => {
    it('should return the current time as a valid ISO 8601 string', () => {
      const isoString = nowAsISO()
      const date = new Date(isoString)
      // Check if the string is a valid ISO 8601 date format
      expect(date.toISOString()).toBe(isoString)
    })
  })

  // Test for nowAsUnix
  describe('nowAsUnix', () => {
    it('should return the current time as a Unix timestamp', () => {
      const timestamp = nowAsUnix()
      // Check if the timestamp is a valid number and close to the current time
      expect(typeof timestamp).toBe('number')
      expect(timestamp).toBeCloseTo(Date.now(), -2) // Allow for a small delay
    })
  })
})
