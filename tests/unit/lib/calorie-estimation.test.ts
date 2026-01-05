/**
 * @jest-environment jsdom
 */
import { estimateIncrementalCaloriesBurned } from '@/lib/calorie-estimation'

describe('Calorie Estimation', () => {
  const testCases = [
    [
      'realistic data',
      { heartRate: 150, age: 30, weightKg: 70, durationMinutes: 30 },
      339.9,
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
      'older, lighter person',
      { heartRate: 140, age: 65, weightKg: 55, durationMinutes: 60 },
      445.3,
    ],
    [
      'younger, heavier person',
      { heartRate: 160, age: 22, weightKg: 90, durationMinutes: 45 },
      637.8,
    ],
    [
      'high but valid values',
      { heartRate: 195, age: 25, weightKg: 100, durationMinutes: 120 },
      2373.8,
    ],
    [
      'low but valid values',
      { heartRate: 90, age: 40, weightKg: 60, durationMinutes: 15 },
      19.9,
    ],
  ]

  test.each(testCases)(
    'should calculate correctly for %s',
    (_description, params, expected) => {
      const calories = estimateIncrementalCaloriesBurned({
        heartRate: params.heartRate,
        age: params.age,
        weight: params.weightKg,
        durationMinutes: params.durationMinutes,
      })
      if (expected === 0) {
        expect(calories).toBe(0)
      } else {
        expect(calories).toBeCloseTo(expected, 1)
      }
    }
  )
})
