import { objectFromEntries, roundTo, formatDuration } from '@/lib/utils'

describe('lib/utils', () => {
  describe('objectFromEntries', () => {
    it('should create an object from entries', () => {
      const entries: [string, number][] = [
        ['a', 1],
        ['b', 2],
      ]
      expect(objectFromEntries(entries)).toEqual({ a: 1, b: 2 })
    })

    it('should filter out null and undefined values', () => {
      const entries: [string, number | null | undefined][] = [
        ['a', 1],
        ['b', null],
        ['c', 3],
        ['d', undefined],
      ]
      expect(objectFromEntries(entries)).toEqual({ a: 1, c: 3 })
    })

    it('should return an empty object for an empty array', () => {
      expect(objectFromEntries([])).toEqual({})
    })
  })

  describe('roundTo', () => {
    it('should round to the specified decimal places', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23)
      expect(roundTo(1.2355, 2)).toBe(1.24)
    })

    it('should handle floating point precision issues', () => {
      expect(roundTo(1.005, 2)).toBe(1.01)
    })

    it('should handle negative numbers', () => {
      expect(roundTo(-1.2345, 2)).toBe(-1.23)
    })
  })

  describe('formatDuration', () => {
    it('should format seconds into HH:MM:SS', () => {
      expect(formatDuration(3661)).toBe('01:01:01')
    })

    it('should handle invalid inputs', () => {
      expect(formatDuration(NaN)).toBe('00:00:00')
      expect(formatDuration(-1)).toBe('00:00:00')
    })

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('00:00:00')
      expect(formatDuration(59)).toBe('00:00:59')
      expect(formatDuration(60)).toBe('00:01:00')
      expect(formatDuration(3599)).toBe('00:59:59')
      expect(formatDuration(3600)).toBe('01:00:00')
    })
  })
})
