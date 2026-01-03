/** @jest-environment jsdom */
import { cmToFeetAndInches, feetAndInchesToCm } from './units'

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

  it('should round to the nearest inch', () => {
    expect(cmToFeetAndInches(175.25)).toEqual({ feet: 5, inches: 9 }) // rounds to 69 inches
    expect(cmToFeetAndInches(176.53)).toEqual({ feet: 5, inches: 10 }) // rounds to 70 inches
  })
})

describe('feetAndInchesToCm', () => {
  it('should correctly convert feet and inches to centimeters', () => {
    expect(feetAndInchesToCm(5, 9)).toBeCloseTo(175.26)
  })

  it('should handle zero feet and inches', () => {
    expect(feetAndInchesToCm(0, 0)).toBe(0)
  })

  it('should handle only feet', () => {
    expect(feetAndInchesToCm(5, 0)).toBeCloseTo(152.4)
  })

  it('should handle only inches', () => {
    expect(feetAndInchesToCm(0, 9)).toBeCloseTo(22.86)
  })
})
