/**
 * @file Unit tests for the time utility functions in `lib/core/time.ts`.
 * @jest-environment node
 */
import { formatDuration } from '../../../../lib/core/time'

describe('lib/core/time.ts', () => {
  describe('formatDuration', () => {
    it('should format a duration in seconds to HH:MM:SS', () => {
      expect(formatDuration(3661)).toBe('01:01:01')
    })

    it('should handle zero seconds', () => {
      expect(formatDuration(0)).toBe('00:00:00')
    })

    it('should handle negative numbers', () => {
      expect(formatDuration(-10)).toBe('00:00:00')
    })

    it('should handle NaN', () => {
      expect(formatDuration(NaN)).toBe('00:00:00')
    })

    it('should pad hours, minutes, and seconds with zeros', () => {
      expect(formatDuration(1)).toBe('00:00:01')
      expect(formatDuration(60)).toBe('00:01:00')
      expect(formatDuration(3600)).toBe('01:00:00')
    })
  })
})
