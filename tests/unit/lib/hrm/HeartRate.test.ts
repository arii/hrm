// File: tests/unit/lib/hrm/HeartRate.test.ts
import { HeartRate } from '../../../../lib/hrm/HeartRate'

describe('lib/hrm/HeartRate', () => {
  describe('constructor', () => {
    it('should create a HeartRate instance for valid values', () => {
      expect(new HeartRate(100).getValue()).toBe(100)
    })

    it('should throw an error for values less than 0', () => {
      expect(() => new HeartRate(-1)).toThrow(
        'Heart rate must be between 0 and 300.'
      )
    })

    it('should throw an error for values greater than 300', () => {
      expect(() => new HeartRate(301)).toThrow(
        'Heart rate must be between 0 and 300.'
      )
    })
  })

  describe('percentageOf', () => {
    it('should correctly calculate the percentage', () => {
      const currentHr = new HeartRate(150)
      const maxHr = new HeartRate(200)
      expect(currentHr.percentageOf(maxHr)).toBe(75)
    })

    it('should return 0 if maxHr is 0 to avoid division by zero', () => {
      const currentHr = new HeartRate(150)
      const maxHr = new HeartRate(0)
      expect(currentHr.percentageOf(maxHr)).toBe(0)
    })

    it('should cap the percentage at 100', () => {
      const currentHr = new HeartRate(220)
      const maxHr = new HeartRate(200)
      expect(currentHr.percentageOf(maxHr)).toBe(100)
    })
  })
})
