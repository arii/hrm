// tests/unit/lib/calorie-estimation.test.ts
/** @jest-environment jsdom */
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'

describe('estimateCaloriesBurned', () => {
  const baseParams = {
    age: 35,
    weightKg: 75,
    durationMinutes: 30,
  }

  it('should return 0 for invalid inputs', () => {
    expect(
      estimateCaloriesBurned({
        ...baseParams,
        heartRate: 0,
        gender: 'male' as const,
      })
    ).toBe(0)
    expect(
      estimateCaloriesBurned({
        ...baseParams,
        heartRate: 150,
        durationMinutes: -10,
        gender: 'male' as const,
      })
    ).toBe(0)
  })

  it('calculates calories correctly for a male (default)', () => {
    const calories = estimateCaloriesBurned({
      ...baseParams,
      heartRate: 155,
      // gender defaults to 'male'
    })
    // Expected value based on a manual calculation of the formula
    // ((-55.0969 + 0.6309 * 155 + 0.1988 * 75 + 0.2017 * 35) / 4.184) * 30 = 389.4
    expect(calories).toBeCloseTo(389.4, 1)
  })

  it('calculates calories correctly for explicit male', () => {
    const calories = estimateCaloriesBurned({
      ...baseParams,
      heartRate: 155,
      gender: 'male',
    })
    expect(calories).toBeCloseTo(389.4, 1)
  })

  it('calculates calories correctly for a female', () => {
    const calories = estimateCaloriesBurned({
      ...baseParams,
      heartRate: 155,
      gender: 'female',
    })
    // Expected value based on a manual calculation of the formula
    // ((-20.4022 + 0.4472 * 155 - 0.1263 * 75 + 0.074 * 35) / 4.184) * 30 = 301.9
    expect(calories).toBeCloseTo(301.9, 1)
  })

  it('should not return a negative number for calories', () => {
    // Use an unusually low heart rate that might result in a negative intermediate value
    const calories = estimateCaloriesBurned({
      ...baseParams,
      heartRate: 50,
      gender: 'male',
    })
    expect(calories).toBeGreaterThanOrEqual(0)
  })
})
