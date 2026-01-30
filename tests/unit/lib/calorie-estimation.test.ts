/**
 * @jest-environment jsdom
 */
import {
  estimateCaloriesBurned,
  CalorieEstimationParams,
} from '@/lib/calorie-estimation'

describe('Calorie Estimation', () => {
  const testCases: Array<[string, CalorieEstimationParams, number]> = [
    [
      'realistic data (Male)',
      {
        heartRate: 150,
        age: 30,
        weightKg: 70,
        durationMinutes: 30,
        isMale: true,
      },
      426.7,
    ],
    [
      'realistic data (Female)',
      {
        heartRate: 150,
        age: 30,
        weightKg: 70,
        durationMinutes: 30,
        isMale: false,
      },
      287.2, // Manual calc: (-20.4022 + 0.4472*150 - 0.1263*70 + 0.074*30) / 4.184 * 30
      // = (-20.4022 + 67.08 - 8.841 + 2.22) / 4.184 * 30
      // = (40.0568) / 4.184 * 30 = 9.57 * 30 = 287.
      // Wait, let's recheck constants.
      // Female: -20.4022, HR 0.4472, W -0.1263, A 0.074.
      // -20.4022 + (0.4472 * 150) + (-0.1263 * 70) + (0.074 * 30)
      // = -20.4022 + 67.08 - 8.841 + 2.22
      // = 40.0568.
      // 40.0568 / 4.184 = 9.5738.
      // 9.5738 * 30 = 287.2.
      // Let's use 287.2 for expectation.
    ],
    [
      'zero duration',
      { heartRate: 150, age: 30, weightKg: 70, durationMinutes: 0 },
      0,
    ],
    [
      'very low heart rate',
      { heartRate: 29, age: 30, weightKg: 70, durationMinutes: 30 },
      0,
    ],
    [
      'older, lighter male',
      {
        heartRate: 140,
        age: 65,
        weightKg: 55,
        durationMinutes: 60,
        isMale: true,
      },
      821.3,
    ],
    [
      'younger, heavier female',
      {
        heartRate: 160,
        age: 22,
        weightKg: 90,
        durationMinutes: 45,
        isMale: false,
      },
      // -20.4022 + 0.4472*160 - 0.1263*90 + 0.074*22
      // = -20.4022 + 71.552 - 11.367 + 1.628
      // = 41.4108.
      // 41.4108 / 4.184 = 9.897.
      // 9.897 * 45 = 445.4.
      445.4,
    ],
  ]

  test.each(testCases)(
    'should calculate correctly for %s',
    (description, params, expected) => {
      const calories = estimateCaloriesBurned(params as CalorieEstimationParams)
      if (expected === 0) {
        expect(calories).toBe(0)
      } else {
        expect(calories).toBeCloseTo(expected, 1)
      }
    }
  )
})
