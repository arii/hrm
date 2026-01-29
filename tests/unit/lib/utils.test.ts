// tests/unit/lib/utils.test.ts
import { formatDuration } from '@/lib/utils'

describe('formatDuration', () => {
  it('should format seconds into HH:MM:SS format', () => {
    expect(formatDuration(3661, { unit: 'seconds' })).toBe('01:01:01')
  })

  it('should format milliseconds into HH:MM:SS format', () => {
    expect(formatDuration(3661000, { unit: 'milliseconds' })).toBe('01:01:01')
  })

  it('should format seconds into MM:SS format', () => {
    expect(formatDuration(61, { unit: 'seconds', format: 'MM:SS' })).toBe(
      '1:01'
    )
  })

  it('should format milliseconds into MM:SS format', () => {
    expect(
      formatDuration(61000, { unit: 'milliseconds', format: 'MM:SS' })
    ).toBe('1:01')
  })

  it('should handle zero duration', () => {
    expect(formatDuration(0, { unit: 'seconds' })).toBe('00:00:00')
    expect(formatDuration(0, { unit: 'milliseconds', format: 'MM:SS' })).toBe(
      '0:00'
    )
  })

  it('should handle negative duration', () => {
    expect(formatDuration(-1, { unit: 'seconds' })).toBe('00:00:00')
    expect(formatDuration(-1, { unit: 'milliseconds', format: 'MM:SS' })).toBe(
      '00:00'
    )
  })

  it('should handle NaN duration', () => {
    expect(formatDuration(NaN, { unit: 'seconds' })).toBe('00:00:00')
    expect(formatDuration(NaN, { unit: 'milliseconds', format: 'MM:SS' })).toBe(
      '00:00'
    )
  })
})
