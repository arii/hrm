/**
 * @jest-environment jsdom
 */
import {
  KeytelFormula,
  CustomFormula,
  CalorieEstimationParams,
} from '@/lib/calorie-estimation'
import { CalorieService } from '@/lib/calorie-service'

describe('Calorie Calculation Strategies', () => {
  describe('KeytelFormula', () => {
    const calculator = new KeytelFormula()
    const testCases: Array<[string, CalorieEstimationParams, number]> = [
      [
        'realistic data',
        { heartRate: 150, age: 30, weightKg: 70, durationMinutes: 30 },
        426.7,
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
        821.3,
      ],
      [
        'younger, heavier person',
        { heartRate: 160, age: 22, weightKg: 90, durationMinutes: 45 },
        733.3,
      ],
      [
        'high but valid values',
        { heartRate: 195, age: 25, weightKg: 100, durationMinutes: 120 },
        2663.0,
      ],
      [
        'low but valid values',
        { heartRate: 90, age: 40, weightKg: 60, durationMinutes: 15 },
        77.7,
      ],
    ]

    test.each(testCases)(
      'should calculate correctly for %s',
      (description, params, expected) => {
        const calories = calculator.calculate(params as CalorieEstimationParams)
        if (expected === 0) {
          expect(calories).toBe(0)
        } else {
          expect(calories).toBeCloseTo(expected, 1)
        }
      }
    )
  })

  describe('CustomFormula', () => {
    const calculator = new CustomFormula()
    it('should calculate calories using a simple MET-based formula', () => {
      const params = {
        heartRate: 130, // Not used in this formula
        age: 28, // Not used
        weightKg: 75,
        durationMinutes: 30,
      }
      const calories = calculator.calculate(params)
      // METs = 5; (5 * 75 * 30) / 60 = 187.5
      expect(calories).toBeCloseTo(187.5)
    })
  })
})

describe('CalorieService', () => {
  it('should use KeytelFormula by default', () => {
    const service = new CalorieService() // No strategy provided
    const params = {
      heartRate: 150,
      age: 30,
      weightKg: 70,
      durationMinutes: 30,
    }
    const calories = service.estimateCalories(params)
    expect(calories).toBeCloseTo(426.7, 1)
  })

  it('should accept a custom strategy (CustomFormula)', () => {
    const customCalculator = new CustomFormula()
    const service = new CalorieService(customCalculator)
    const params = {
      heartRate: 130,
      age: 28,
      weightKg: 75,
      durationMinutes: 30,
    }
    const calories = service.estimateCalories(params)
    expect(calories).toBeCloseTo(187.5)
  })
})
