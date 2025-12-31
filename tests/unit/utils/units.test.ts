import {
  cmToFeetAndInches,
  feetAndInchesToCm,
  toKg,
  toDisplay,
} from '../../../utils/units'

describe('cmToFeetAndInches', () => {
  it('should correctly convert cm to feet and inches', () => {
    expect(cmToFeetAndInches(175)).toEqual({ feet: 5, inches: 9 })
  })

  it('should handle zero cm correctly', () => {
    expect(cmToFeetAndInches(0)).toEqual({ feet: 0, inches: 0 })
  })

  it('should handle negative cm correctly', () => {
    expect(cmToFeetAndInches(-10)).toEqual({ feet: 0, inches: 0 })
  })

  it('should handle floating point cm values', () => {
    expect(cmToFeetAndInches(182.88)).toEqual({ feet: 6, inches: 0 })
  })
})

describe('feetAndInchesToCm', () => {
  it('should correctly convert feet and inches to cm', () => {
    expect(feetAndInchesToCm(5, 9)).toBeCloseTo(175.26)
  })

  it('should handle zero feet and inches correctly', () => {
    expect(feetAndInchesToCm(0, 0)).toBe(0)
  })

  it('should handle only feet', () => {
    expect(feetAndInchesToCm(6, 0)).toBeCloseTo(182.88)
  })

  it('should handle only inches', () => {
    expect(feetAndInchesToCm(0, 12)).toBeCloseTo(30.48)
  })
})

describe('toKg', () => {
  it('should correctly convert lbs to kg', () => {
    expect(toKg(154, 'IMPERIAL')).toBeCloseTo(69.85)
  })

  it('should return the same value for metric system', () => {
    expect(toKg(70, 'METRIC')).toBe(70)
  })
})

describe('toDisplay', () => {
  it('should correctly convert kg to lbs', () => {
    expect(toDisplay(70, 'IMPERIAL')).toBeCloseTo(154.3)
  })

  it('should return the same value for metric system', () => {
    expect(toDisplay(70, 'METRIC')).toBe(70)
  })
})
