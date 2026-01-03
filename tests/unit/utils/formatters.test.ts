// File: tests/unit/utils/formatters.test.ts
import { formatDuration } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format milliseconds into MM:SS format for durations less than an hour', () => {
    expect(formatDuration(60000)).toBe('01:00')
    expect(formatDuration(90000)).toBe('01:30')
    expect(formatDuration(125000)).toBe('02:05')
    expect(formatDuration(0)).toBe('00:00')
  })

  it('should format milliseconds into HH:MM:SS format for durations an hour or longer', () => {
    expect(formatDuration(3600000)).toBe('1:00:00')
    expect(formatDuration(3661000)).toBe('1:01:01')
    expect(formatDuration(86399000)).toBe('23:59:59')
  })
})
