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

  describe('estimateCaloriesBurned (gender-neutral)', () => {
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

    // Comprehensive test cases for various user profiles and activity levels
    describe('with diverse user profiles and activities', () => {
      const testCases = [
        // profile, params, expected approx calories
        {
          profile: 'Younger, lighter individual, lower intensity',
          params: { heartRate: 120, age: 25, weightKg: 60, durationMinutes: 45 },
          expected: 404.2,
        },
        {
          profile: 'Older, heavier individual, higher intensity',
          params: { heartRate: 160, age: 55, weightKg: 90, durationMinutes: 20 },
          expected: 357.7,
        },
        {
          profile: 'Average individual, very high intensity',
          params: { heartRate: 180, age: 35, weightKg: 75, durationMinutes: 60 },
          expected: 1153.5,
        },
        {
          profile: 'Edge Case: Very lightweight individual',
          params: { heartRate: 140, age: 30, weightKg: 45, durationMinutes: 30 },
          expected: 345.8,
        },
        {
          profile: 'Edge Case: Very heavyweight individual',
          params: { heartRate: 140, age: 30, weightKg: 120, durationMinutes: 30 },
          expected: 452.7,
        },
        {
          profile: 'Edge Case: Very young individual',
          params: { heartRate: 160, age: 18, weightKg: 65, durationMinutes: 40 },
          expected: 596.6,
        },
        {
          profile: 'Edge Case: Very old individual',
          params: { heartRate: 130, age: 75, weightKg: 70, durationMinutes: 25 },
          expected: 334.4,
        },
      ]

      test.each(testCases)(
        'should calculate correctly for: $profile',
        ({ params, expected }) => {
          const calories = estimateCaloriesBurned(params)
          expect(calories).toBeCloseTo(expected, 1)
        }
      )
    })
  })
})
