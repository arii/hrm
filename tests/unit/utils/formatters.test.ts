/**
 * @jest-environment jsdom
 */
import { formatDuration } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format seconds into MM:SS format', () => {
    expect(formatDuration(60)).toBe('01:00')
    expect(formatDuration(90)).toBe('01:30')
    expect(formatDuration(125)).toBe('02:05')
    expect(formatDuration(0)).toBe('00:00')
  })

  it('should handle NaN and negative numbers gracefully', () => {
    expect(formatDuration(NaN)).toBe('00:00')
    expect(formatDuration(-100)).toBe('00:00')
  })

  it('should pad minutes and seconds with leading zeros', () => {
    expect(formatDuration(5)).toBe('00:05')
    expect(formatDuration(60 * 3 + 7)).toBe('03:07')
  })
})
