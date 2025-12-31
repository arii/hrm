import { calculateMaxHr, calculateTargetHr } from '@/lib/hrm/calculators'

describe('HRM Calculators', () => {
  describe('calculateMaxHr (Tanaka Equation)', () => {
    // Formula: 208 - (0.7 * age)

    it('accurately calculates Max HR for a standard age (30)', () => {
      // 208 - (0.7 * 30) = 208 - 21 = 187
      const result = calculateMaxHr(30)
      expect(result).toBe(187)
    })

    it('accurately calculates Max HR for a middle-aged user (50)', () => {
      // 208 - (0.7 * 50) = 208 - 35 = 173
      const result = calculateMaxHr(50)
      expect(result).toBe(173)
    })

    it('handles rounding correctly (Age 25)', () => {
      // 208 - (0.7 * 25) = 208 - 17.5 = 190.5 -> Rounds up to 191
      const result = calculateMaxHr(25)
      expect(result).toBe(191)
    })

    it('returns default fallback (190) for age 0 or undefined', () => {
      // @ts-expect-error Testing runtime safety for invalid input
      expect(calculateMaxHr(0)).toBe(190)
      // @ts-expect-error Testing runtime safety for invalid input
      expect(calculateMaxHr(undefined)).toBe(190)
    })

    it('returns default fallback (190) for negative age', () => {
      const result = calculateMaxHr(-5)
      expect(result).toBe(190)
    })

    it('returns valid results for elderly ages (e.g., 90)', () => {
      // 208 - (0.7 * 90) = 208 - 63 = 145
      const result = calculateMaxHr(90)
      expect(result).toBe(145)
    })
  })

  describe('calculateTargetHr', () => {
    it('calculates 50% of 180 bpm correctly', () => {
      const result = calculateTargetHr(180, 50)
      expect(result).toBe(90)
    })

    it('calculates 85% of 190 bpm with correct rounding', () => {
      // 190 * 0.85 = 161.5 -> rounds to 162
      const result = calculateTargetHr(190, 85)
      expect(result).toBe(162)
    })

    it('handles 100% intensity (Max HR)', () => {
      const result = calculateTargetHr(200, 100)
      expect(result).toBe(200)
    })

    it('handles 0% intensity', () => {
      const result = calculateTargetHr(200, 0)
      expect(result).toBe(0)
    })
  })
})
