import {
  calculateKarvonenHr,
  calculateZoneFromHrr,
  calculateZoneFromMaxHr,
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

    it('returns zone 0 for heart rate below resting HR', () => {
      const result = calculateZoneFromHrr(50, maxHr, restingHr)
      expect(result.percentage).toBe(0)
      expect(result.zone).toBe(0)
    })

    it('identifies all zones correctly with standard thresholds', () => {
      // Reserve = 140. Thresh: 50, 60, 70, 80, 90, 95
      // Zone 1: 50% * 140 + 60 = 70 + 60 = 130
      expect(calculateZoneFromHrr(130, maxHr, restingHr).zone).toBe(1)
      // Zone 2: 60% * 140 + 60 = 84 + 60 = 144
      expect(calculateZoneFromHrr(144, maxHr, restingHr).zone).toBe(2)
      // Zone 3: 70% * 140 + 60 = 98 + 60 = 158
      expect(calculateZoneFromHrr(158, maxHr, restingHr).zone).toBe(3)
      // Zone 4: 80% * 140 + 60 = 112 + 60 = 172
      expect(calculateZoneFromHrr(172, maxHr, restingHr).zone).toBe(4)
      // Zone 5: 90% * 140 + 60 = 126 + 60 = 186
      expect(calculateZoneFromHrr(186, maxHr, restingHr).zone).toBe(5)
      // Zone 6: 95% * 140 + 60 = 133 + 60 = 193
      expect(calculateZoneFromHrr(193, maxHr, restingHr).zone).toBe(6)
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

  describe('calculateZoneFromMaxHr', () => {
    const maxHr = 200

    it('calculates correct zone and percentage for 100 bpm', () => {
      // 100 / 200 = 50%
      const result = calculateZoneFromMaxHr(100, maxHr)
      expect(result.percentage).toBe(50)
      expect(result.zone).toBe(1)
    })

    it('respects custom thresholds', () => {
      const customThresholds = { ...ZONE_THRESHOLDS, ZONE_1: 40 }
      // 80 bpm -> 80 / 200 = 40%
      const result = calculateZoneFromMaxHr(80, maxHr, customThresholds)
      expect(result.percentage).toBe(40)
      expect(result.zone).toBe(1)
    })

    it('identifies all zones correctly with standard thresholds', () => {
      expect(calculateZoneFromMaxHr(100, maxHr).zone).toBe(1) // 50%
      expect(calculateZoneFromMaxHr(120, maxHr).zone).toBe(2) // 60%
      expect(calculateZoneFromMaxHr(140, maxHr).zone).toBe(3) // 70%
      expect(calculateZoneFromMaxHr(160, maxHr).zone).toBe(4) // 80%
      expect(calculateZoneFromMaxHr(180, maxHr).zone).toBe(5) // 90%
      expect(calculateZoneFromMaxHr(190, maxHr).zone).toBe(6) // 95%
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

    it('handles age-based calculation in config object', () => {
      // age 20 -> maxHr 200. 100 bpm -> 50% -> zone 1
      const result = calculateHrZoneInfo(100, { method: 'MAX_HR', age: 20 })
      expect(result.percentage).toBe(50)
      expect(result.zone).toBe(1)
    })
  })
})
