// tests/unit/utils/units.test.ts
import { kgToLbs, lbsToKg } from '@/utils/units'

describe('Unit Conversion Utilities', () => {
  describe('kgToLbs', () => {
    it('should correctly convert kilograms to pounds', () => {
      expect(kgToLbs(1)).toBeCloseTo(2.20462)
      expect(kgToLbs(100)).toBeCloseTo(220.462)
      expect(kgToLbs(0)).toBe(0)
    })
  })

  describe('lbsToKg', () => {
    it('should correctly convert pounds to kilograms', () => {
      expect(lbsToKg(2.20462)).toBeCloseTo(1)
      expect(lbsToKg(220.462)).toBeCloseTo(100)
      expect(lbsToKg(0)).toBe(0)
    })
  })
})
