// File: tests/unit/lib/calorie-estimation.test.ts
/**
 * @jest-environment node
 */
import {
  estimateCaloriesBurned,
  CalorieEstimationParams,
} from '../../../lib/calorie-estimation'

describe('lib/calorie-estimation', () => {
  const baseParams: CalorieEstimationParams = {
    heartRate: 150, // Active HR
    age: 35,
    weightKg: 75,
    durationMinutes: 30,
  }

  describe('estimateCaloriesBurned (fallback gender-neutral)', () => {
    it('should calculate a reasonable calorie burn for a typical workout', () => {
      const calories = estimateCaloriesBurned(baseParams)
      // Based on the formula: (-55.0969 + 0.6309*150 + 0.1988*75 + 0.2017*35) / 4.184 * 30
      // Expected: Approx. 441.0 kcal.
      expect(calories).toBeGreaterThan(440)
      expect(calories).toBeLessThan(442)
      expect(calories).toBeCloseTo(441.0, 1)
    })

    it('should return 0 if heart rate is 30 or less', () => {
      const params = { ...baseParams, heartRate: 30 }
      expect(estimateCaloriesBurned(params)).toBe(0)
    })

    it('should return 0 if duration is 0 or less', () => {
      const paramsZero = { ...baseParams, durationMinutes: 0 }
      const paramsNegative = { ...baseParams, durationMinutes: -10 }
      expect(estimateCaloriesBurned(paramsZero)).toBe(0)
      expect(estimateCaloriesBurned(paramsNegative)).toBe(0)
    })

    it('should not return a negative calorie value', () => {
      // Use extreme values that might push the intercept to dominate
      const params = {
        heartRate: 40, // very low HR
        age: 80, // high age
        weightKg: 40, // low weight
        durationMinutes: 10,
      }
      const calories = estimateCaloriesBurned(params)
      expect(calories).toBeGreaterThanOrEqual(0)
    })
  })

  describe('estimateCaloriesBurned (Mifflin-St Jeor with METs)', () => {
    const newParams: CalorieEstimationParams = {
      ...baseParams,
      heightCm: 180,
      gender: 'male',
    }

    it('should calculate calories for a male user', () => {
      const calories = estimateCaloriesBurned(newParams)
      // BMR = 10 * 75 + 6.25 * 180 - 5 * 35 + 5 = 1705
      // Max HR = 208 - 0.7 * 35 = 183.5
      // % Max HR = 150 / 183.5 = 0.817
      // METs = 17.5 * 0.817 - 5.75 = 8.55
      // Calories = 8.55 * (1705 / (24 * 60)) * 30 = 303.8
      expect(calories).toBeCloseTo(304, 0)
    })

    it('should calculate calories for a female user', () => {
      const femaleParams = { ...newParams, gender: 'female' as const }
      const calories = estimateCaloriesBurned(femaleParams)
      // BMR = 10 * 75 + 6.25 * 180 - 5 * 35 - 161 = 1539
      // METs = 8.55
      // Calories = 8.55 * (1539 / (24 * 60)) * 30 = 274.3
      expect(calories).toBeCloseTo(274, 0)
    })

    it('should calculate calories for a user with gender "other"', () => {
      const otherParams = { ...newParams, gender: 'other' as const }
      const calories = estimateCaloriesBurned(otherParams)
      // BMR (avg) = (1705 + 1539) / 2 = 1622
      // METs = 8.55
      // Calories = 8.55 * (1622 / (24 * 60)) * 30 = 289.1
      expect(calories).toBeCloseTo(289, 0)
    })
  })
})
