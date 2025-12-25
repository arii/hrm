// File: tests/unit/utils/units.test.ts
import { kgToLbs, lbsToKg, formatWeight } from '../../../utils/units'

describe('utils/units', () => {
  describe('kgToLbs', () => {
    it('should correctly convert kilograms to pounds', () => {
      expect(kgToLbs(70)).toBeCloseTo(154.3234)
      expect(kgToLbs(0)).toBe(0)
      expect(kgToLbs(100)).toBeCloseTo(220.462)
    })
  })

  describe('lbsToKg', () => {
    it('should correctly convert pounds to kilograms', () => {
      expect(lbsToKg(154.3234)).toBeCloseTo(70)
      expect(lbsToKg(0)).toBe(0)
      expect(lbsToKg(220.462)).toBeCloseTo(100)
    })
  })

  describe('formatWeight', () => {
    it('should format weight in METRIC without a unit', () => {
      const formatted = formatWeight(75.6, 'METRIC', { includeUnit: false })
      expect(formatted).toBe('76')
    })

    it('should format weight in METRIC with a unit', () => {
      const formatted = formatWeight(75.6, 'METRIC', { includeUnit: true })
      expect(formatted).toBe('76 kg')
    })

    it('should format weight in IMPERIAL without a unit', () => {
      const formatted = formatWeight(70, 'IMPERIAL', { includeUnit: false })
      expect(formatted).toBe('154') // 70kg is ~154.32 lbs
    })

    it('should format weight in IMPERIAL with a unit', () => {
      const formatted = formatWeight(70, 'IMPERIAL', { includeUnit: true })
      expect(formatted).toBe('154 lbs')
    })

    it('should handle zero correctly', () => {
      const formatted = formatWeight(0, 'METRIC')
      expect(formatted).toBe('0 kg')
    })

    it('should default to including the unit', () => {
      const formatted = formatWeight(80, 'IMPERIAL')
      expect(formatted).toBe('176 lbs')
    })
  })
})
