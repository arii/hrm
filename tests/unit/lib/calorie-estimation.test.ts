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
      'realistic data',
      { heartRate: 150, age: 30, weightKg: 70 },
      14.22,
    ],
    [
      'very low heart rate',
      { heartRate: 29, age: 30, weightKg: 70 },
      0,
    ],
    [
      'older, lighter person',
      { heartRate: 140, age: 65, weightKg: 55 },
      13.68,
    ],
    [
      'younger, heavier person',
      { heartRate: 160, age: 22, weightKg: 90 },
      16.29,
    ],
    [
      'high but valid values',
      { heartRate: 195, age: 25, weightKg: 100 },
      22.19,
    ],
    [
      'low but valid values',
      { heartRate: 90, age: 40, weightKg: 60 },
      5.18,
    ],
  ]

  test.each(testCases)(
    'should calculate correctly for %s',
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
