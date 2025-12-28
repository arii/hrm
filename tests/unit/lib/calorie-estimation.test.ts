/**
 * @jest-environment jsdom
 */
import {
  estimateCaloriesPerMinute,
  CalorieEstimationParams,
} from '@/lib/calorie-estimation'

describe('Calorie Estimation', () => {
  const testCases: Array<[string, CalorieEstimationParams, number]> = [
    [
      'should calculate correctly for realistic data (HR=150, Age=30, Weight=70) and return 14.22',
      { heartRate: 150, age: 30, weightKg: 70 },
      14.22,
    ],
    [
      'should return 0 for very low heart rate (HR=29)',
      { heartRate: 29, age: 30, weightKg: 70 },
      0,
    ],
    [
      'should return 0 for heart rate at boundary (HR=30)',
      { heartRate: 30, age: 30, weightKg: 70 },
      0,
    ],
    [
      'should calculate correctly for older, lighter person (HR=140, Age=65, Weight=55) and return 13.68',
      { heartRate: 140, age: 65, weightKg: 55 },
      13.68,
    ],
    [
      'should calculate correctly for younger, heavier person (HR=160, Age=22, Weight=90) and return 16.29',
      { heartRate: 160, age: 22, weightKg: 90 },
      16.29,
    ],
    [
      'should calculate correctly for high but valid values (HR=195, Age=25, Weight=100) and return 22.19',
      { heartRate: 195, age: 25, weightKg: 100 },
      22.19,
    ],
    [
      'should calculate correctly for low but valid values (HR=90, Age=40, Weight=60) and return 5.18',
      { heartRate: 90, age: 40, weightKg: 60 },
      5.18,
    ],
  ]

  test.each(testCases)(
    '%s',
    (description, params, expected) => {
      const calories = estimateCaloriesPerMinute(params as CalorieEstimationParams)
      if (expected === 0) {
        expect(calories).toBe(0)
      } else {
        expect(calories).toBeCloseTo(expected, 1)
      }
    }
  )
})
