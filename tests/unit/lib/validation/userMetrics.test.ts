import {
  validateAgeValue,
  validateHeightValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'

describe('User Metrics Validation', () => {
  describe('validateAgeValue', () => {
    it('should return null for valid age', () => {
      expect(validateAgeValue('30')).toBeNull()
    })

    it('should return error for age less than 1', () => {
      expect(validateAgeValue('0')).toBe('Please enter a valid age (1-120)')
    })

    it('should return error for age greater than 120', () => {
      expect(validateAgeValue('121')).toBe('Please enter a valid age (1-120)')
    })

    it('should return null for empty string', () => {
      expect(validateAgeValue('')).toBeNull()
    })
  })

  describe('validateHeightValue', () => {
    it('should return null for valid height in metric', () => {
      expect(validateHeightValue(175, 'METRIC')).toBeNull()
    })

    it('should return null for valid height in imperial', () => {
      expect(validateHeightValue(175, 'IMPERIAL')).toBeNull()
    })

    it('should return error for height less than 100cm in metric', () => {
      expect(validateHeightValue(99, 'METRIC')).toBe(
        'Please enter a valid height (100-250 cm)'
      )
    })

    it('should return error for height greater than 250cm in metric', () => {
      expect(validateHeightValue(251, 'METRIC')).toBe(
        'Please enter a valid height (100-250 cm)'
      )
    })

    it('should return error for height less than 100cm in imperial', () => {
      expect(validateHeightValue(99, 'IMPERIAL')).toBe(
        'Please enter a valid height (3ft 3in - 8ft 2in)'
      )
    })

    it('should return error for height greater than 250cm in imperial', () => {
      expect(validateHeightValue(251, 'IMPERIAL')).toBe(
        'Please enter a valid height (3ft 3in - 8ft 2in)'
      )
    })
  })

  describe('validateWeightValue', () => {
    it('should return null for valid weight in metric', () => {
      expect(validateWeightValue('70', 'METRIC')).toBeNull()
    })

    it('should return null for valid weight in imperial', () => {
      expect(validateWeightValue('154', 'IMPERIAL')).toBeNull()
    })

    it('should return error for weight less than 30kg in metric', () => {
      expect(validateWeightValue('29', 'METRIC')).toBe(
        'Please enter a valid weight (30-200)'
      )
    })

    it('should return error for weight greater than 200kg in metric', () => {
      expect(validateWeightValue('201', 'METRIC')).toBe(
        'Please enter a valid weight (30-200)'
      )
    })

    it('should return error for weight less than 66lbs in imperial', () => {
      expect(validateWeightValue('65', 'IMPERIAL')).toBe(
        'Please enter a valid weight (66-440)'
      )
    })

    it('should return error for weight greater than 440lbs in imperial', () => {
      expect(validateWeightValue('441', 'IMPERIAL')).toBe(
        'Please enter a valid weight (66-440)'
      )
    })

    it('should return null for empty string', () => {
      expect(validateWeightValue('', 'METRIC')).toBeNull()
    })
  })
})
