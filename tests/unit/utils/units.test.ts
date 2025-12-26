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
  })
})
