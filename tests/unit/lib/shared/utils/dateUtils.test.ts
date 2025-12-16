import {
  toISO8601,
  toUnixTimestamp,
  nowAsISO,
  nowAsUnix,
} from '@/lib/shared/utils/dateUtils'

describe('lib/shared/utils/dateUtils', () => {
  // Test for toISO8601
  describe('toISO8601', () => {
    it('should convert a Date object to an ISO 8601 string', () => {
      const date = new Date('1995-12-17T03:24:00Z')
      expect(toISO8601(date)).toBe('1995-12-17T03:24:00.000Z')
    })

    it('should convert a Unix timestamp to an ISO 8601 string', () => {
      const timestamp = 1609459200000
      expect(toISO8601(timestamp)).toBe('2021-01-01T00:00:00.000Z')
    })
  })

  // Test for toUnixTimestamp
  describe('toUnixTimestamp', () => {
    it('should convert an ISO 8601 string to a Unix timestamp', () => {
      const isoString = '1995-12-17T03:24:00.000Z'
      expect(toUnixTimestamp(isoString)).toBe(819170640000)
    })
  })

  // Test for nowAsISO
  describe('nowAsISO', () => {
    it('should return the current time as an ISO 8601 string', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(nowAsISO()).toMatch(isoRegex)
    })
  })

  // Test for nowAsUnix
  describe('nowAsUnix', () => {
    it('should return the current time as a Unix timestamp', () => {
      const timestamp = nowAsUnix()
      expect(typeof timestamp).toBe('number')
      expect(timestamp).toBeGreaterThan(1609459200000) // Check if it's a reasonable timestamp
    })
  })
})
