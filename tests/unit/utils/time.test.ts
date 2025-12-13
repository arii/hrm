import { formatDuration } from '../../../utils/time'

describe('formatDuration', () => {
  it('should format a duration of 0 seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('should format a duration of less than a minute', () => {
    expect(formatDuration(30)).toBe('00:00:30')
  })

  it('should format a duration of exactly one minute', () => {
    expect(formatDuration(60)).toBe('00:01:00')
  })

  it('should format a duration of less than an hour', () => {
    expect(formatDuration(3599)).toBe('00:59:59')
  })

  it('should format a duration of exactly one hour', () => {
    expect(formatDuration(3600)).toBe('01:00:00')
  })

  it('should format a duration of more than one hour', () => {
    expect(formatDuration(3661)).toBe('01:01:01')
  })

  it('should format a large duration', () => {
    expect(formatDuration(86399)).toBe('23:59:59') // 24 hours - 1 second
  })
})
