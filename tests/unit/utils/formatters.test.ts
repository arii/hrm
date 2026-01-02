/**
 * @jest-environment jsdom
 */
import {
  formatSecondsToMMSS,
  formatMillisecondsToMMSS,
} from '@/utils/formatters'

describe('formatSecondsToMMSS', () => {
  it('should format seconds into MM:SS format', () => {
    expect(formatSecondsToMMSS(60)).toBe('01:00')
    expect(formatSecondsToMMSS(90)).toBe('01:30')
    expect(formatSecondsToMMSS(125)).toBe('02:05')
    expect(formatSecondsToMMSS(0)).toBe('00:00')
  })

  it('should handle NaN and negative numbers gracefully', () => {
    expect(formatSecondsToMMSS(NaN)).toBe('00:00')
    expect(formatSecondsToMMSS(-100)).toBe('00:00')
  })

  it('should pad minutes and seconds with leading zeros', () => {
    expect(formatSecondsToMMSS(5)).toBe('00:05')
    expect(formatSecondsToMMSS(60 * 3 + 7)).toBe('03:07')
  })
})

describe('formatMillisecondsToMMSS', () => {
  it('should format milliseconds into MM:SS format', () => {
    expect(formatMillisecondsToMMSS(60000)).toBe('01:00')
    expect(formatMillisecondsToMMSS(90000)).toBe('01:30')
    expect(formatMillisecondsToMMSS(125000)).toBe('02:05')
    expect(formatMillisecondsToMMSS(0)).toBe('00:00')
  })

  it('should handle NaN and negative numbers gracefully', () => {
    expect(formatMillisecondsToMMSS(NaN)).toBe('00:00')
    expect(formatMillisecondsToMMSS(-100)).toBe('00:00')
  })

  it('should pad minutes and seconds with leading zeros', () => {
    expect(formatMillisecondsToMMSS(5000)).toBe('00:05')
    expect(formatMillisecondsToMMSS(187000)).toBe('03:07')
  })
})
