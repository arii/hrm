/**
 * @jest-environment jsdom
 */
import { calculateCaloriesBurned } from '@/utils/calculations'

describe('calculateCaloriesBurned', () => {
  const ONE_MINUTE = 60 * 1000

  // Helper to generate mock HR data
  const generateHrData = (points: number, startTime: number, avgHr: number) => {
    const data = []
    for (let i = 0; i < points; i++) {
      data.push({
        timestamp: startTime + i * 1000,
        value: avgHr + (Math.random() - 0.5) * 10, // Add some jitter
      })
    }
    return data
  }

  it('should return 0 if there are less than 2 data points', () => {
    const hrData = [{ timestamp: Date.now(), value: 120 }]
    expect(calculateCaloriesBurned(30, hrData)).toBe(0)
  })

  it('should return 0 for invalid age', () => {
    const hrData = generateHrData(120, Date.now(), 150)
    expect(calculateCaloriesBurned(0, hrData)).toBe(0)
    expect(calculateCaloriesBurned(-10, hrData)).toBe(0)
  })

  it('should return 0 for unrealistic average heart rate', () => {
    const lowHrData = generateHrData(120, Date.now(), 30)
    const highHrData = generateHrData(120, Date.now(), 260)
    expect(calculateCaloriesBurned(30, lowHrData)).toBe(0)
    expect(calculateCaloriesBurned(30, highHrData)).toBe(0)
  })

  it('should return 0 for zero or negative duration', () => {
    const now = Date.now()
    const hrData = [
      { timestamp: now, value: 150 },
      { timestamp: now, value: 150 },
    ]
    expect(calculateCaloriesBurned(30, hrData)).toBe(0)
  })

  it('should calculate a reasonable calorie burn for a 30-year-old', () => {
    const startTime = Date.now()
    const durationMinutes = 10
    const hrData = generateHrData(durationMinutes * 60, startTime, 150) // 10 minutes at 150bpm avg

    const calories = calculateCaloriesBurned(30, hrData)

    // Expected: For a 30yo at 150bpm, C/min is approx 12.8 kcal/min
    // So, for 10 minutes, it should be around 128 kcal.
    // We'll check for a reasonable range.
    expect(calories).toBeGreaterThan(100)
    expect(calories).toBeLessThan(150)
  })

  it('should calculate a higher calorie burn for an older person with the same HR', () => {
    const startTime = Date.now()
    const durationMinutes = 10
    const hrData = generateHrData(durationMinutes * 60, startTime, 150)

    const calories30yo = calculateCaloriesBurned(30, hrData)
    const calories50yo = calculateCaloriesBurned(50, hrData)

    // The formula increases calorie burn with age, holding HR constant.
    expect(calories50yo).toBeGreaterThan(calories30yo)
  })

  it('should return a non-negative number even with unusual data', () => {
    const hrData = [
      { timestamp: Date.now(), value: 50 },
      { timestamp: Date.now() + ONE_MINUTE, value: 50 },
    ]
    const calories = calculateCaloriesBurned(20, hrData)
    expect(calories).toBeGreaterThanOrEqual(0)
  })
})
