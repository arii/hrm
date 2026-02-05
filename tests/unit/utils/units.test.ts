// tests/unit/utils/units.test.ts
import {
  formatZoneDuration,
  toKg,
  toDisplay,
  feetAndInchesToCm,
  cmToFeetAndInches,
  KG_TO_LBS,
} from '../../../utils/units'

describe('formatZoneDuration', () => {
  it('should format durations less than a minute correctly', () => {
    expect(formatZoneDuration(30)).toBe('0:30')
    expect(formatZoneDuration(59)).toBe('0:59')
  })

  it('should format durations of exactly one minute correctly', () => {
    expect(formatZoneDuration(60)).toBe('1:00')
  })

  it('should format durations between a minute and an hour correctly', () => {
    expect(formatZoneDuration(90)).toBe('1:30')
    expect(formatZoneDuration(3599)).toBe('59:59')
  })

  it('should format durations of exactly one hour correctly', () => {
    expect(formatZoneDuration(3600)).toBe('1h 0m 0s')
  })

  it('should format durations over an hour correctly', () => {
    expect(formatZoneDuration(3661)).toBe('1h 1m 1s')
  })

  it('should handle zero seconds', () => {
    expect(formatZoneDuration(0)).toBe('0:00')
  })
})

describe('Weight Conversions', () => {
  describe('toKg', () => {
    it('should convert lbs to kg correctly (Imperial)', () => {
      const lbs = 150
      const expected = lbs / KG_TO_LBS
      expect(toKg(lbs, 'IMPERIAL')).toBeCloseTo(expected)
    })

    it('should return value as is for Metric', () => {
      const kg = 70
      expect(toKg(kg, 'METRIC')).toBe(kg)
    })
  })

  describe('toDisplay', () => {
    it('should convert kg to lbs correctly (Imperial)', () => {
      const kg = 70
      const expected = parseFloat((kg * KG_TO_LBS).toFixed(1))
      expect(toDisplay(kg, 'IMPERIAL')).toBe(expected)
    })

    it('should return kg rounded to 1 decimal for Metric', () => {
      const kg = 70.123
      expect(toDisplay(kg, 'METRIC')).toBe(70.1)
    })
  })
})

describe('Height Conversions', () => {
  describe('feetAndInchesToCm', () => {
    it('should convert feet and inches to cm correctly', () => {
      const feet = 5
      const inches = 10
      // (5 * 12 + 10) * 2.54 = 70 * 2.54 = 177.8
      expect(feetAndInchesToCm(feet, inches)).toBeCloseTo(177.8)
    })
  })

  describe('cmToFeetAndInches', () => {
    it('should convert cm to feet and inches correctly', () => {
      const cm = 178
      // 178 / 2.54 = 70.0787... -> 70 inches -> 5'10"
      const result = cmToFeetAndInches(cm)
      expect(result).toEqual({ feet: 5, inches: 10 })
    })

    it('should handle zero/negative/invalid input', () => {
      expect(cmToFeetAndInches(0)).toEqual({ feet: 0, inches: 0 })
      expect(cmToFeetAndInches(-10)).toEqual({ feet: 0, inches: 0 })
      expect(cmToFeetAndInches(NaN)).toEqual({ feet: 0, inches: 0 })
    })
  })
})
