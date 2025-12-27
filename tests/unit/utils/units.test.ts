// tests/unit/utils/units.test.ts

import { toKg, toDisplay } from '../../../utils/units'

describe('Unit Conversion Utilities', () => {
  describe('toKg', () => {
    it('should correctly convert lbs to kg', () => {
      const pounds = 150
      const expectedKg = 68.0389
      expect(toKg(pounds, 'IMPERIAL')).toBeCloseTo(expectedKg, 4)
    })

    it('should return the same value if the system is METRIC', () => {
      const kilograms = 70
      expect(toKg(kilograms, 'METRIC')).toBe(kilograms)
    })

    it('should handle zero', () => {
      expect(toKg(0, 'IMPERIAL')).toBe(0)
      expect(toKg(0, 'METRIC')).toBe(0)
    })

    it('should handle large numbers', () => {
      expect(toKg(1000, 'IMPERIAL')).toBeCloseTo(453.5929)
    })
  })

  describe('toDisplay', () => {
    it('should correctly convert kg to lbs for display', () => {
      const kilograms = 68.0389
      const expectedLbs = 150.0
      expect(toDisplay(kilograms, 'IMPERIAL')).toBe(expectedLbs)
    })

    it('should round the lbs value to one decimal place', () => {
      const kilograms = 70
      const expectedLbs = 154.3
      expect(toDisplay(kilograms, 'IMPERIAL')).toBe(expectedLbs)
    })

    it('should return the same value rounded to one decimal if the system is METRIC', () => {
      const kilograms = 70.123
      expect(toDisplay(kilograms, 'METRIC')).toBe(70.1)
    })

    it('should handle zero', () => {
      expect(toDisplay(0, 'IMPERIAL')).toBe(0)
      expect(toDisplay(0, 'METRIC')).toBe(0)
    })

    it('should handle large numbers', () => {
      expect(toDisplay(500, 'IMPERIAL')).toBe(1102.3)
    })
  })
})
