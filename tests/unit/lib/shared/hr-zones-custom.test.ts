import {
  calculateKarvonenHr,
  calculateZoneFromHrr,
  calculateHrZoneInfo,
  ZONE_THRESHOLDS,
} from '@/lib/shared/hr-zones'

describe('HR Zone Customization Logic', () => {
  const maxHr = 200
  const restingHr = 60

  describe('calculateKarvonenHr', () => {
    it('calculates correct heart rate for 50% intensity', () => {
      // (200 - 60) * 0.5 + 60 = 140 * 0.5 + 60 = 70 + 60 = 130
      expect(calculateKarvonenHr(50, maxHr, restingHr)).toBe(130)
    })

    it('calculates correct heart rate for 100% intensity', () => {
      expect(calculateKarvonenHr(100, maxHr, restingHr)).toBe(200)
    })

    it('calculates correct heart rate for 0% intensity', () => {
      expect(calculateKarvonenHr(0, maxHr, restingHr)).toBe(60)
    })
  })

  describe('calculateZoneFromHrr', () => {
    it('calculates correct zone and percentage for 130 bpm', () => {
      // (130 - 60) / (200 - 60) = 70 / 140 = 50%
      const result = calculateZoneFromHrr(130, maxHr, restingHr)
      expect(result.percentage).toBe(50)
      expect(result.zone).toBe(1)
    })

    it('respects custom thresholds', () => {
      const customThresholds = { ...ZONE_THRESHOLDS, ZONE_1: 40 }
      // 116 bpm -> (116 - 60) / 140 = 56 / 140 = 40%
      const result = calculateZoneFromHrr(
        116,
        maxHr,
        restingHr,
        customThresholds
      )
      expect(result.percentage).toBe(40)
      expect(result.zone).toBe(1)
    })
  })

  describe('calculateHrZoneInfo with config object', () => {
    it('uses HRR method when specified', () => {
      const config = {
        method: 'HRR' as const,
        maxHrOverride: 200,
        restingHr: 60,
      }
      const result = calculateHrZoneInfo(130, config)
      expect(result.percentage).toBe(50)
      expect(result.zone).toBe(1)
    })

    it('uses custom thresholds when specified', () => {
      const config = {
        method: 'MAX_HR' as const,
        maxHrOverride: 200,
        thresholds: { ...ZONE_THRESHOLDS, ZONE_1: 40 },
      }
      // 80 bpm -> 80 / 200 = 40%
      const result = calculateHrZoneInfo(80, config)
      expect(result.percentage).toBe(40)
      expect(result.zone).toBe(1)
    })

    it('handles legacy age-based calculation if config is a number', () => {
      // age 20 -> maxHr 200. 100 bpm -> 50% -> zone 1
      const result = calculateHrZoneInfo(100, 20)
      expect(result.percentage).toBe(50)
      expect(result.zone).toBe(1)
    })
  })
})
