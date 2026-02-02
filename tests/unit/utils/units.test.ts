// tests/unit/utils/units.test.ts
import { formatZoneDuration } from '../../../utils/units'

describe('formatZoneDuration', () => {
  it('should format durations less than a minute correctly', () => {
    expect(formatZoneDuration(30)).toBe('0:30')
    expect(formatZoneDuration(59)).toBe('0:59')
  })

  it('should format durations of exactly one minute correctly', () => {
    expect(formatZoneDuration(60)).toBe('1:00')
  })

  it('should format durations between a minute and an hour correctly', () => {
    expect(formatZoneDuration(90)).toBe('1:30')
    expect(formatZoneDuration(3599)).toBe('59:59')
  })

  it('should format durations of exactly one hour correctly', () => {
    expect(formatZoneDuration(3600)).toBe('1h 0m 0s')
  })

  it('should format durations over an hour correctly', () => {
    expect(formatZoneDuration(3661)).toBe('1h 1m 1s')
  })

  it('should handle zero seconds', () => {
    expect(formatZoneDuration(0)).toBe('0:00')
  })
})
