// File: tests/unit/utils/units.test.ts
import { kgToLbs, lbsToKg, formatWeight } from '../../../utils/units'

describe('unit conversion utilities', () => {
  describe('kgToLbs', () => {
    it('should correctly convert kilograms to pounds', () => {
      expect(kgToLbs(1)).toBeCloseTo(2.20462)
      expect(kgToLbs(0)).toBe(0)
      expect(kgToLbs(100)).toBeCloseTo(220.462)
    })
  })

  describe('lbsToKg', () => {
    it('should correctly convert pounds to kilograms', () => {
      expect(lbsToKg(2.20462)).toBeCloseTo(1)
      expect(lbsToKg(0)).toBe(0)
      expect(lbsToKg(220.462)).toBeCloseTo(100)
    })
  })

  describe('formatWeight', () => {
    it('should format weight in imperial units', () => {
      expect(formatWeight(75, 'imperial')).toBe('165 lbs')
    })

    it('should format weight in metric units', () => {
      expect(formatWeight(75, 'metric')).toBe('75 kg')
    })
  })
})
