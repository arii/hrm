import { toKg, toDisplay } from '@/utils/units'
import { MeasurementSystem } from '@/types'

describe('utils/units', () => {
  describe('toKg', () => {
    it('should correctly convert lbs to kg', () => {
      const pounds = 150
      const expectedKg = 68.0389
      expect(toKg(pounds, 'IMPERIAL')).toBeCloseTo(expectedKg, 4)
    })

    it('should return the same value if the system is METRIC', () => {
      const kg = 70
      expect(toKg(kg, 'METRIC')).toBe(kg)
    })
  })

  describe('toDisplay', () => {
    it('should correctly convert kg to lbs and round to 1 decimal place', () => {
      const kg = 68.0389
      const expectedLbs = 150.0
      expect(toDisplay(kg, 'IMPERIAL')).toBe(expectedLbs)
    })

    it('should return the same value rounded to 1 decimal if the system is METRIC', () => {
      const kg = 70.123
      const expectedDisplay = 70.1
      expect(toDisplay(kg, 'METRIC')).toBe(expectedDisplay)
    })

    it('should handle zero correctly', () => {
      expect(toDisplay(0, 'IMPERIAL')).toBe(0)
      expect(toDisplay(0, 'METRIC')).toBe(0)
    })
  })
})
