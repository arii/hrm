import { formatDuration } from '@/lib/shared/utils/formatters'

describe('lib/shared/utils/formatters', () => {
  describe('formatDuration', () => {
    it('should format a duration in seconds into a HH:MM:SS string', () => {
      expect(formatDuration(90)).toBe('00:01:30')
      expect(formatDuration(3600)).toBe('01:00:00')
      expect(formatDuration(3661)).toBe('01:01:01')
    })

    it('should return "00:00:00" for a negative duration', () => {
      expect(formatDuration(-10)).toBe('00:00:00')
    })

    it('should return "00:00:00" for an invalid number', () => {
      expect(formatDuration(NaN)).toBe('00:00:00')
    })
  })
})
