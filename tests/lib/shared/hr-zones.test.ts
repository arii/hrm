// tests/lib/shared/hr-zones.test.ts
import {
  calculateMaxHr,
  getUserHrZones,
  HrZoneName,
} from '@/lib/shared/hr-zones'

describe('Heart Rate Zone Calculations', () => {
  describe('calculateMaxHr', () => {
    it('should calculate max heart rate using the Tanaka formula', () => {
      expect(calculateMaxHr(30)).toBeCloseTo(187) // 208 - 0.7 * 30
      expect(calculateMaxHr(50)).toBeCloseTo(173) // 208 - 0.7 * 50
    })

    it('should handle various input types gracefully', () => {
      expect(calculateMaxHr('30')).toBeCloseTo(187)
      expect(calculateMaxHr(null)).toBe(185)
      expect(calculateMaxHr(undefined)).toBe(185)
      expect(calculateMaxHr(0)).toBe(185)
      expect(calculateMaxHr(-10)).toBe(185)
      expect(calculateMaxHr('abc')).toBe(185)
    })
  })

  describe('getUserHrZones', () => {
    it('should calculate HR zones correctly for a given age', () => {
      const age = 30
      const zones = getUserHrZones(age)

      // Tanaka formula: 208 - 0.7 * 30 = 187
      expect(zones.warmUp.min).toBe(94) // 187 * 0.5
      expect(zones.fatBurn.min).toBe(112) // 187 * 0.6
      expect(zones.cardio.min).toBe(131) // 187 * 0.7
      expect(zones.peak.min).toBe(159) // 187 * 0.85
      expect(zones.max.min).toBe(178) // 187 * 0.95
    })
  })

  describe('HrZoneName Enum', () => {
    it('should have the correct string values', () => {
      expect(HrZoneName.WarmUp).toBe('Warm-up')
      expect(HrZoneName.FatBurn).toBe('Fat Burn')
      expect(HrZoneName.Cardio).toBe('Cardio')
      expect(HrZoneName.Peak).toBe('Peak')
      expect(HrZoneName.Max).toBe('Max')
    })
  })
})
