// tests/unit/lib/units.test.ts
import {
  kgToLbs,
  lbsToKg,
  cmToInches,
  inchesToCm,
} from '@/lib/units'

describe('Unit Converters', () => {
  describe('kgToLbs', () => {
    it('should convert kilograms to pounds correctly', () => {
      expect(kgToLbs(70)).toBeCloseTo(154.323)
    })
  })

  describe('lbsToKg', () => {
    it('should convert pounds to kilograms correctly', () => {
      expect(lbsToKg(154.323)).toBeCloseTo(70)
    })
  })

  describe('cmToInches', () => {
    it('should convert centimeters to inches correctly', () => {
      expect(cmToInches(175)).toBeCloseTo(68.8976)
    })
  })

  describe('inchesToCm', () => {
    it('should convert inches to centimeters correctly', () => {
      expect(inchesToCm(68.8976)).toBeCloseTo(175)
    })
  })
})
