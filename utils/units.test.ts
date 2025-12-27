import {
  cmToFeetAndInches,
  feetAndInchesToCm,
  toKg,
  toDisplay,
} from './units'
import { MeasurementSystem } from '../types'

describe('unit conversion utilities', () => {
  describe('cmToFeetAndInches', () => {
    it('should correctly convert centimeters to feet and inches', () => {
      expect(cmToFeetAndInches(175)).toEqual({ feet: 5, inches: 9 })
      expect(cmToFeetAndInches(183)).toEqual({ feet: 6, inches: 0 })
      expect(cmToFeetAndInches(152.4)).toEqual({ feet: 5, inches: 0 })
      expect(cmToFeetAndInches(0)).toEqual({ feet: 0, inches: 0 })
    })

    it('should handle rounding correctly', () => {
      // 5ft 10.86in -> rounds to 5ft 11in
      expect(cmToFeetAndInches(180)).toEqual({ feet: 5, inches: 11 })
      // 5ft 8.5in -> rounds to 5ft 9in
      expect(cmToFeetAndInches(174)).toEqual({ feet: 5, inches: 9 })
    })

    it('should handle invalid input gracefully', () => {
      expect(cmToFeetAndInches(-10)).toEqual({ feet: 0, inches: 0 })
      expect(cmToFeetAndInches(NaN)).toEqual({ feet: 0, inches: 0 })
    })
  })

  describe('feetAndInchesToCm', () => {
    it('should correctly convert feet and inches to centimeters', () => {
      expect(feetAndInchesToCm(5, 9)).toBeCloseTo(175.26)
      expect(feetAndInchesToCm(6, 0)).toBeCloseTo(182.88)
      expect(feetAndInchesToCm(5, 0)).toBeCloseTo(152.4)
      expect(feetAndInchesToCm(0, 0)).toBe(0)
    })

    it('should handle zero feet or inches', () => {
      expect(feetAndInchesToCm(5, 0)).toBeCloseTo(152.4)
      expect(feetAndInchesToCm(0, 11)).toBeCloseTo(27.94)
    })
  })

  describe('toKg', () => {
    it('should return the same value if the system is METRIC', () => {
      expect(toKg(70, 'METRIC')).toBe(70)
    })

    it('should convert pounds to kilograms if the system is IMPERIAL', () => {
      expect(toKg(154, 'IMPERIAL')).toBeCloseTo(69.85)
    })
  })

  describe('toDisplay', () => {
    it('should return the same value (rounded) if the system is METRIC', () => {
      expect(toDisplay(69.853, 'METRIC')).toBe(69.9)
    })

    it('should convert kilograms to pounds if the system is IMPERIAL', () => {
      expect(toDisplay(70, 'IMPERIAL')).toBeCloseTo(154.3)
    })
  })
})
