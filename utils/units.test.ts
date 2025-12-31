/**
 * @jest-environment jsdom
 */
import { cmToFeetAndInches, feetAndInchesToCm, toKg, toDisplay } from './units'

describe('unit conversion utilities', () => {
  describe('cmToFeetAndInches', () => {
    it('should correctly convert centimeters to feet and inches', () => {
      expect(cmToFeetAndInches(175)).toEqual({ feet: 5, inches: 9 })
    })

    it('should handle zero centimeters', () => {
      expect(cmToFeetAndInches(0)).toEqual({ feet: 0, inches: 0 })
    })

    it('should handle negative centimeters', () => {
      expect(cmToFeetAndInches(-10)).toEqual({ feet: 0, inches: 0 })
    })

    it('should handle NaN input', () => {
      expect(cmToFeetAndInches(NaN)).toEqual({ feet: 0, inches: 0 })
    })
  })

  describe('feetAndInchesToCm', () => {
    it('should correctly convert feet and inches to centimeters', () => {
      expect(feetAndInchesToCm(5, 9)).toBeCloseTo(175.26)
    })

    it('should handle zero feet and inches', () => {
      expect(feetAndInchesToCm(0, 0)).toBe(0)
    })
  })

  describe('toKg', () => {
    it('should correctly convert pounds to kilograms', () => {
      expect(toKg(154, 'IMPERIAL')).toBeCloseTo(69.85)
    })

    it('should return the same value for metric system', () => {
      expect(toKg(70, 'METRIC')).toBe(70)
    })
  })

  describe('toDisplay', () => {
    it('should correctly convert kilograms to pounds', () => {
      expect(toDisplay(70, 'IMPERIAL')).toBeCloseTo(154.3)
    })

    it('should return the same value for metric system', () => {
      expect(toDisplay(70, 'METRIC')).toBe(70)
    })
  })
})
