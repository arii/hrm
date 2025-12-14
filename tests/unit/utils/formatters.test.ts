// File: tests/unit/utils/formatters.test.ts
import { formatDuration } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format a duration of 0 seconds correctly', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('should format a duration of less than a minute correctly', () => {
    expect(formatDuration(30)).toBe('00:30')
  })

  it('should format a duration of exactly a minute correctly', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  it('should format a duration of more than a minute correctly', () => {
    expect(formatDuration(90)).toBe('01:30')
  })

  it('should format a duration with leading zeros correctly', () => {
    expect(formatDuration(5)).toBe('00:05')
  })

  it('should handle negative numbers by returning "00:00"', () => {
    expect(formatDuration(-10)).toBe('00:00')
  })

  it('should handle NaN by returning "00:00"', () => {
    expect(formatDuration(NaN)).toBe('00:00')
  })
})
