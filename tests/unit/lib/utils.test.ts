// tests/unit/lib/utils.test.ts
import {
  objectFromEntries,
  roundTo,
  formatDuration,
  formatDate,
  extractGoogleDocId,
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
    const testDate = new Date('2023-10-27T12:00:00Z')

    it('should format a Date object with default options and locale', () => {
      // Note: toLocaleDateString output can vary by environment, but en-US is usually consistent
      const result = formatDate(testDate)
      expect(result).toContain('October 27, 2023')
    })

    it('should format a timestamp with default options and locale', () => {
      const result = formatDate(testDate.getTime())
      expect(result).toContain('October 27, 2023')
    })

    it('should respect custom options', () => {
      const result = formatDate(testDate, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      expect(result).toContain('Oct 27, 2023')
    })

    it('should respect custom locale', () => {
      // In German, October is Oktober
      const result = formatDate(
        testDate,
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
        'de-DE'
      )
      expect(result).toMatch(/27\. Oktober 2023/)
    })
  })

  describe('extractGoogleDocId', () => {
    it('should extract a valid Google Doc ID from a URL', () => {
      const url =
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
      expect(extractGoogleDocId(url)).toBe(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      )
    })

    it('should return undefined for undefined input', () => {
      expect(extractGoogleDocId(undefined)).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      expect(extractGoogleDocId('')).toBeUndefined()
    })

    it('should return undefined for URL without /d/', () => {
      const url = 'https://google.com'
      expect(extractGoogleDocId(url)).toBeUndefined()
    })

    it('should return undefined for short IDs (less than 25 chars)', () => {
      const url = 'https://docs.google.com/d/shortID'
      expect(extractGoogleDocId(url)).toBeUndefined()
    })

    it('should extract ID even with different URL structures', () => {
      const longId = 'a'.repeat(25)
      const url2 = `https://docs.google.com/presentation/d/${longId}/edit`
      expect(extractGoogleDocId(url2)).toBe(longId)
    })
  })
})
