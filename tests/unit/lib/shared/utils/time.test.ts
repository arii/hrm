/**
 * @file Unit tests for the time utility functions.
 * @module tests/unit/lib/shared/utils/time.test
 */
import { formatDuration } from '@/lib/shared/utils/time'

describe('lib/shared/utils/time.ts', () => {
  describe('formatDuration', () => {
    it('should format a duration of 0 seconds', () => {
      expect(formatDuration(0)).toBe('00:00:00')
    })

    it('should format a duration of less than a minute', () => {
      expect(formatDuration(45)).toBe('00:00:45')
    })

    it('should format a duration of exactly one minute', () => {
      expect(formatDuration(60)).toBe('00:01:00')
    })

    it('should format a duration of several minutes and seconds', () => {
      expect(formatDuration(150)).toBe('00:02:30')
    })

    it('should format a duration of exactly one hour', () => {
      expect(formatDuration(3600)).toBe('01:00:00')
    })

    it('should format a long duration with hours, minutes, and seconds', () => {
      expect(formatDuration(9876)).toBe('02:44:36')
    })

    it('should handle negative numbers by returning 00:00:00', () => {
      expect(formatDuration(-100)).toBe('00:00:00')
    })

    it('should handle NaN by returning 00:00:00', () => {
      expect(formatDuration(NaN)).toBe('00:00:00')
    })

    it('should correctly pad single-digit hours, minutes, and seconds', () => {
        expect(formatDuration(3661)).toBe('01:01:01')
    });
  })
})
