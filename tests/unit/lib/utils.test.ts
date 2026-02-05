// tests/unit/lib/utils.test.ts
import {
  objectFromEntries,
  roundTo,
  formatDuration,
  formatDate,
} from '@/lib/utils'

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
    it('should format seconds into HH:MM:SS format', () => {
      expect(formatDuration(3661, { unit: 'seconds' })).toBe('01:01:01')
    })

    it('should format milliseconds into HH:MM:SS format', () => {
      expect(formatDuration(3661000, { unit: 'milliseconds' })).toBe('01:01:01')
    })

    it('should format seconds into MM:SS format', () => {
      expect(formatDuration(61, { unit: 'seconds', format: 'MM:SS' })).toBe(
        '01:01'
      )
    })

    it('should format milliseconds into MM:SS format', () => {
      expect(
        formatDuration(61000, { unit: 'milliseconds', format: 'MM:SS' })
      ).toBe('01:01')
    })

    it('should handle zero duration', () => {
      expect(formatDuration(0, { unit: 'seconds' })).toBe('00:00:00')
      expect(formatDuration(0, { unit: 'milliseconds', format: 'MM:SS' })).toBe(
        '00:00'
      )
    })

    it('should handle negative duration', () => {
      expect(formatDuration(-1, { unit: 'seconds' })).toBe('00:00:00')
      expect(
        formatDuration(-1, { unit: 'milliseconds', format: 'MM:SS' })
      ).toBe('00:00')
    })

    it('should handle NaN duration', () => {
      expect(formatDuration(NaN, { unit: 'seconds' })).toBe('00:00:00')
      expect(
        formatDuration(NaN, { unit: 'milliseconds', format: 'MM:SS' })
      ).toBe('00:00')
    })

    it('should handle edge cases', () => {
      expect(formatDuration(0, { unit: 'seconds' })).toBe('00:00:00')
      expect(formatDuration(59, { unit: 'seconds' })).toBe('00:00:59')
      expect(formatDuration(60, { unit: 'seconds' })).toBe('00:01:00')
      expect(formatDuration(3599, { unit: 'seconds' })).toBe('00:59:59')
      expect(formatDuration(3600, { unit: 'seconds' })).toBe('01:00:00')
    })
  })

  describe('formatDate', () => {
    it('should format a date into a localized string', () => {
      const date = new Date('2025-02-13T12:00:00')
      expect(formatDate(date)).toBe('Feb 13, 2025')
    })
  })
})
