// File: tests/unit/lib/calorie-estimation.test.ts
/**
 * @jest-environment node
 */
import {
  estimateCaloriesBurned,
  estimateCaloriesByGender,
  CalorieEstimationParams,
  Gender,
} from '../../../lib/calorie-estimation'

describe('Calorie Estimation Module', () => {
  const baseParams: CalorieEstimationParams = {
    heartRate: 150, // Active HR
    age: 35,
    weightKg: 75,
    durationMinutes: 30,
  }

  describe('estimateCaloriesBurned (gender-neutral)', () => {
    it('should calculate a reasonable calorie burn for a typical workout', () => {
      const calories = estimateCaloriesBurned(baseParams)
      // Based on the formula: (0.074 + 0.4472*150 - 0.05741*75 + 0.074*35) / 4.184 * 30
      // Expected: Approx. 421.2 kcal.
      expect(calories).toBeGreaterThan(420)
      expect(calories).toBeLessThan(422)
      expect(calories).toBeCloseTo(421.2, 1)
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

  describe('estimateCaloriesByGender (deprecated)', () => {
    it('should calculate a higher calorie burn for males than females with identical stats', () => {
      const maleCalories = estimateCaloriesByGender(baseParams, 'male')
      const femaleCalories = estimateCaloriesByGender(baseParams, 'female')

      expect(maleCalories).toBeGreaterThan(femaleCalories)
      expect(maleCalories).toBeCloseTo(441.0, 1)
      expect(femaleCalories).toBeCloseTo(421.2, 1)
    })

    it('should return 0 if heart rate is below the viable threshold', () => {
      const params = { ...baseParams, heartRate: 29 }
      expect(estimateCaloriesByGender(params, 'male')).toBe(0)
      expect(estimateCaloriesByGender(params, 'female')).toBe(0)
    })

    it('should return 0 if duration is non-positive', () => {
      const params = { ...baseParams, durationMinutes: 0 }
      expect(estimateCaloriesByGender(params, 'male')).toBe(0)
      expect(estimateCaloriesByGender(params, 'female')).toBe(0)
    })

    it('should handle different genders correctly', () => {
      const maleParams: CalorieEstimationParams = {
        heartRate: 160,
        age: 40,
        weightKg: 85,
        durationMinutes: 60,
      }
      const femaleParams: CalorieEstimationParams = {
        heartRate: 160,
        age: 40,
        weightKg: 65,
        durationMinutes: 60,
      }
      const maleCalories = estimateCaloriesByGender(maleParams, 'male')
      const femaleCalories = estimateCaloriesByGender(femaleParams, 'female')

      // Plausibility checks
      expect(maleCalories).toBeGreaterThan(800)
      expect(femaleCalories).toBeGreaterThan(500)
      expect(maleCalories).toBeGreaterThan(femaleCalories)
    })
  })
})
