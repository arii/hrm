// tests/unit/app/client/connect/validation.test.ts
import {
  validateAgeValue,
  validateWeightValue,
} from '@/app/client/connect/validation'

describe('validation', () => {
  describe('validateAgeValue', () => {
    it('returns null for a valid age', () => {
      expect(validateAgeValue('30')).toBeNull()
    })

    it('returns an error message for an invalid age', () => {
      expect(validateAgeValue('abc')).toBe('Please enter a valid age (1-120)')
      expect(validateAgeValue('0')).toBe('Please enter a valid age (1-120)')
      expect(validateAgeValue('121')).toBe('Please enter a valid age (1-120)')
    })
  })

  describe('validateWeightValue', () => {
    it('returns null for a valid weight in imperial units', () => {
      expect(validateWeightValue('150', 'IMPERIAL')).toBeNull()
    })

    it('returns an error message for an invalid weight in imperial units', () => {
      expect(validateWeightValue('abc', 'IMPERIAL')).toBe(
        'Please enter a valid weight (66-440)'
      )
      expect(validateWeightValue('65', 'IMPERIAL')).toBe(
        'Please enter a valid weight (66-440)'
      )
      expect(validateWeightValue('441', 'IMPERIAL')).toBe(
        'Please enter a valid weight (66-440)'
      )
    })

    it('returns null for a valid weight in metric units', () => {
      expect(validateWeightValue('70', 'METRIC')).toBeNull()
    })

    it('returns an error message for an invalid weight in metric units', () => {
      expect(validateWeightValue('abc', 'METRIC')).toBe(
        'Please enter a valid weight (30-200)'
      )
      expect(validateWeightValue('29', 'METRIC')).toBe(
        'Please enter a valid weight (30-200)'
      )
      expect(validateWeightValue('201', 'METRIC')).toBe(
        'Please enter a valid weight (30-200)'
      )
    })
  })
})
