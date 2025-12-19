/**
 * @jest-environment jsdom
 */
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'

describe('Calorie Estimation', () => {
  // Baseline test with realistic data
  it('should estimate calories burned with realistic data', () => {
    const params = {
      heartRate: 150,
      age: 30,
      weightKg: 70,
      durationMinutes: 30,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBeCloseTo(426.7, 1)
  })

  // Edge case: zero duration
  it('should return 0 calories for zero duration', () => {
    const params = {
      heartRate: 150,
      age: 30,
      weightKg: 70,
      durationMinutes: 0,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBe(0)
  })

  // Edge case: low heart rate
  it('should return 0 calories for very low heart rate', () => {
    const params = {
      heartRate: 29,
      age: 30,
      weightKg: 70,
      durationMinutes: 30,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBe(0)
  })

  // User profile: older, lighter person
  it('should calculate correctly for an older, lighter person', () => {
    const params = {
      heartRate: 140,
      age: 65,
      weightKg: 55,
      durationMinutes: 60,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBeCloseTo(821.3, 1)
  })

  // User profile: younger, heavier person
  it('should calculate correctly for a younger, heavier person', () => {
    const params = {
      heartRate: 160,
      age: 22,
      weightKg: 90,
      durationMinutes: 45,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBeCloseTo(733.3, 1)
  })

  // High but valid values
  it('should handle high but valid values', () => {
    const params = {
      heartRate: 195,
      age: 25,
      weightKg: 100,
      durationMinutes: 120,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBeCloseTo(2663.0, 1)
  })

  // Low but valid values
  it('should handle low but valid values', () => {
    const params = {
      heartRate: 90,
      age: 40,
      weightKg: 60,
      durationMinutes: 15,
    }
    const calories = estimateCaloriesBurned(params)
    expect(calories).toBeCloseTo(77.7, 1)
  })
})
