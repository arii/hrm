/**
 * @file Unit tests for the health utility functions.
 * @module tests/unit/lib/shared/utils/health.test
 */
import { calculateMaxHr } from '@/lib/shared/utils/health'

describe('lib/shared/utils/health.ts', () => {
  describe('calculateMaxHr', () => {
    it('should calculate the max heart rate for a given age as a number', () => {
      expect(calculateMaxHr(30)).toBe(190)
    })

    it('should calculate the max heart rate for a given age as a string', () => {
      expect(calculateMaxHr('25')).toBe(195)
    })

    it('should return the default max heart rate for a null age', () => {
      expect(calculateMaxHr(null)).toBe(190)
    })

    it('should return the default max heart rate for an undefined age', () => {
      expect(calculateMaxHr(undefined)).toBe(190)
    })

    it('should return the default max heart rate for an invalid age string', () => {
      expect(calculateMaxHr('abc')).toBe(190)
    })

    it('should return the default max heart rate for a zero age', () => {
      expect(calculateMaxHr(0)).toBe(190)
    })

    it('should return the default max heart rate for a negative age', () => {
      expect(calculateMaxHr(-10)).toBe(190)
    })

    it('should handle a valid age string with extra spaces', () => {
      expect(calculateMaxHr(' 40 ')).toBe(180)
    })
  })
})
