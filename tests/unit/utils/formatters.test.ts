import { formatDuration, formatNumber } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format milliseconds into MM:SS format', () => {
    expect(formatDuration(60000)).toBe('1:00')
    expect(formatDuration(90000)).toBe('1:30')
    expect(formatDuration(125000)).toBe('2:05')
    expect(formatDuration(0)).toBe('0:00')
  })
})

describe('formatNumber', () => {
  test.each([
    { value: 123.456, expected: '123.46' },
    { value: 78, expected: '78.00' },
    { value: 0, expected: '0.00' },
    { value: 99.995, expected: '100.00' },
    { value: null, expected: '0.00' },
    { value: undefined, expected: '0.00' },
  ])('formats $value as $expected', ({ value, expected }) => {
    expect(formatNumber(value)).toBe(expected)
  })
})
