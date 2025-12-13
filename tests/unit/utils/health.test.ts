import { calculateCaloriesBurned } from '../../../utils/health'

describe('calculateCaloriesBurned', () => {
  it('should return 0 if averageHr is 0', () => {
    expect(calculateCaloriesBurned(0, 30, 600)).toBe(0)
  })

  it('should return 0 if userAge is 0', () => {
    expect(calculateCaloriesBurned(120, 0, 600)).toBe(0)
  })

  it('should return 0 if durationInSeconds is 0', () => {
    expect(calculateCaloriesBurned(120, 30, 0)).toBe(0)
  })

  it('should calculate calories for Zone 1', () => {
    // 59% of max HR for a 30-year-old is ~112 bpm
    expect(calculateCaloriesBurned(112, 30, 600)).toBeCloseTo(40) // 10 minutes * 4 kcal/min
  })

  it('should calculate calories for Zone 2', () => {
    // 65% of max HR for a 30-year-old is ~123.5 bpm
    expect(calculateCaloriesBurned(123.5, 30, 600)).toBeCloseTo(70) // 10 minutes * 7 kcal/min
  })

  it('should calculate calories for Zone 3', () => {
    // 75% of max HR for a 30-year-old is ~142.5 bpm
    expect(calculateCaloriesBurned(142.5, 30, 600)).toBeCloseTo(100) // 10 minutes * 10 kcal/min
  })

  it('should calculate calories for Zone 4', () => {
    // 85% of max HR for a 30-year-old is ~161.5 bpm
    expect(calculateCaloriesBurned(161.5, 30, 600)).toBeCloseTo(130) // 10 minutes * 13 kcal/min
  })

  it('should calculate calories for Zone 5', () => {
    // 95% of max HR for a 30-year-old is ~180.5 bpm
    expect(calculateCaloriesBurned(180.5, 30, 600)).toBeCloseTo(160) // 10 minutes * 16 kcal/min
  })

  it('should handle boundary conditions between zones', () => {
    // Exactly 60% of max HR for a 30-year-old is 114 bpm
    expect(calculateCaloriesBurned(114, 30, 600)).toBeCloseTo(70) // Should be in Zone 2
    // Exactly 70% of max HR for a 30-year-old is 133 bpm
    expect(calculateCaloriesBurned(133, 30, 600)).toBeCloseTo(100) // Should be in Zone 3
  })
})
