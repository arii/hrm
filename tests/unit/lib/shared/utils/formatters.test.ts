/**
 * @jest-environment jsdom
 */
import { formatDuration } from '@/lib/shared/utils/formatters'

describe('formatters', () => {
  describe('formatDuration', () => {
    it('should format a duration in seconds into a HH:MM:SS string', () => {
      expect(formatDuration(3661)).toBe('01:01:01')
    })

    it('should return "00:00:00" for a negative duration', () => {
      expect(formatDuration(-1)).toBe('00:00:00')
    })

    it('should return "00:00:00" for a NaN duration', () => {
      expect(formatDuration(NaN)).toBe('00:00:00')
    })

    it('should pad the hours, minutes, and seconds with a leading zero if they are less than 10', () => {
      expect(formatDuration(1)).toBe('00:00:01')
      expect(formatDuration(60)).toBe('00:01:00')
      expect(formatDuration(3600)).toBe('01:00:00')
    })
  })
})
