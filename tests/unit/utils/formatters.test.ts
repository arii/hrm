// File: tests/unit/utils/formatters.test.ts
import { formatDuration } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format milliseconds into MM:SS format', () => {
    expect(formatDuration(60000)).toBe('1:00')
    expect(formatDuration(90000)).toBe('1:30')
    expect(formatDuration(125000)).toBe('2:05')
    expect(formatDuration(0)).toBe('0:00')
  })
})
