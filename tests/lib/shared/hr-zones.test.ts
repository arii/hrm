// tests/lib/shared/hr-zones.test.ts
import { calculateMaxHr, getUserHrZones } from '@/lib/shared/hr-zones'

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
      expect(zones.warmUp.min).toBe(95) // 190 * 0.5
      expect(zones.fatBurn.min).toBe(114) // 190 * 0.6
      expect(zones.cardio.min).toBe(133) // 190 * 0.7
      expect(zones.peak.min).toBe(162) // 190 * 0.85
      expect(zones.max.min).toBe(181) // 190 * 0.95
    })
  })
})
