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
        gender: 'MALE',
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
        gender: 'FEMALE',
      },
      287.2,
    ],
    [
      'realistic data (Neutral)',
      {
        heartRate: 150,
        age: 30,
        weightKg: 70,
        durationMinutes: 30,
        gender: 'NEUTRAL',
      },
      287.2,
    ],
    [
      'realistic data (Default to Neutral)',
      {
        heartRate: 150,
        age: 30,
        weightKg: 70,
        durationMinutes: 30,
      },
      287.2,
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
        gender: 'MALE',
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
        gender: 'FEMALE',
      },
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
