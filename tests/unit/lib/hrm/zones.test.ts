// tests/unit/lib/hrm/zones.test.ts
import { calculateMaxHr } from '@/lib/hrm/zones'

describe('calculateMaxHr', () => {
  it('should return the correct max HR for a valid age', () => {
    expect(calculateMaxHr(30)).toBeCloseTo(187, 0)
  })

  it('should return a default value for an age of 0', () => {
    expect(calculateMaxHr(0)).toBe(208)
  })

  it('should return a default value for a negative age', () => {
    expect(calculateMaxHr(-10)).toBe(208)
  })
})
