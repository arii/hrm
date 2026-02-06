// tests/lib/shared/hr-zones.test.ts
import {
  calculateMaxHr,
  getUserHrZones,
  calculateHrZone,
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
      expect(HrZoneName.Resting).toBe('Resting')
      expect(HrZoneName.WarmUp).toBe('Warm-up')
      expect(HrZoneName.FatBurn).toBe('Fat Burn')
      expect(HrZoneName.Cardio).toBe('Cardio')
      expect(HrZoneName.Peak).toBe('Peak')
      expect(HrZoneName.Max).toBe('Max')
    })
  })

  describe('calculateHrZone', () => {
    const maxHr = 200

    it('should return "No Data" for invalid inputs', () => {
      expect(calculateHrZone(0, maxHr)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(100, 0)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(-1, maxHr)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
    })

    it('should correctly calculate the "Resting" zone', () => {
      // 40% of 200 is 80
      const result = calculateHrZone(80, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Resting)
      expect(result.percentage).toBe(40)
      expect(result.bpm).toBe(80)
    })

    it('should correctly calculate the "Warm-up" zone', () => {
      // 55% of 200 is 110
      const result = calculateHrZone(110, maxHr)
      expect(result.zoneName).toBe(HrZoneName.WarmUp)
      expect(result.percentage).toBe(55)
      expect(result.bpm).toBe(110)
    })

    it('should correctly calculate the "Fat Burn" zone', () => {
      // 65% of 200 is 130
      const result = calculateHrZone(130, maxHr)
      expect(result.zoneName).toBe(HrZoneName.FatBurn)
      expect(result.percentage).toBe(65)
    })

    it('should correctly calculate the "Cardio" zone', () => {
      // 75% of 200 is 150
      const result = calculateHrZone(150, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(75)
    })

    it('should correctly calculate the "Peak" zone', () => {
      // 90% of 200 is 180
      const result = calculateHrZone(180, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Peak)
      expect(result.percentage).toBe(90)
    })

    it('should correctly calculate the "Max" zone', () => {
      // 98% of 200 is 196
      const result = calculateHrZone(196, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      expect(result.percentage).toBe(98)
    })

    it('should handle the exact lower boundary of a zone', () => {
      // 70% of 200 is 140, which is the start of Cardio
      const result = calculateHrZone(140, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(70)
    })

    it('should handle HR values exceeding the maximum', () => {
      const result = calculateHrZone(220, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      // Percentage should be capped at 100
      expect(result.percentage).toBe(100)
      expect(result.bpm).toBe(220)
    })
  })
})
