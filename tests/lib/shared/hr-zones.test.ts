// tests/lib/shared/hr-zones.test.ts
import {
  calculateMaxHr,
  getUserHrZones,
  HR_ZONE_CONFIG,
} from '@/lib/shared/hr-zones'

describe('Heart Rate Zone Calculations', () => {
  describe('calculateMaxHr', () => {
    it('should calculate max heart rate using the Haskell & Fox formula', () => {
      expect(calculateMaxHr(30)).toBe(190) // 220 - 30
      expect(calculateMaxHr(50)).toBe(170) // 220 - 50
    })

    it('should handle various input types gracefully', () => {
      expect(calculateMaxHr('30')).toBe(190)
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

      // Haskell & Fox formula: 220 - 30 = 190
      expect(zones.warmUp.min).toBe(Math.round(190 * (60 / 100))) // ZONE_2 threshold 60
      expect(zones.fatBurn.min).toBe(Math.round(190 * (70 / 100))) // ZONE_3 threshold 70
      expect(zones.cardio.min).toBe(Math.round(190 * (80 / 100))) // ZONE_4 threshold 80
      expect(zones.peak.min).toBe(Math.round(190 * (90 / 100))) // ZONE_5 threshold 90
      expect(zones.max.min).toBe(Math.round(190 * (95 / 100))) // ZONE_6 threshold 95
    })
  })

  describe('HR_ZONE_CONFIG', () => {
    it('should have the correct labels and thresholds', () => {
      expect(HR_ZONE_CONFIG.ZONE_2.label).toBe('Warm Up')
      expect(HR_ZONE_CONFIG.ZONE_3.label).toBe('Fat Burn')
      expect(HR_ZONE_CONFIG.ZONE_4.label).toBe('Cardio')
      expect(HR_ZONE_CONFIG.ZONE_5.label).toBe('Peak')
    })
  })
})
