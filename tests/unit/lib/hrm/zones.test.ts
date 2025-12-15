// File: tests/unit/lib/hrm/zones.test.ts
import {
  calculateHrZone,
  getZoneBpmRange,
  HR_ZONE_DEFINITIONS,
} from '../../../../lib/hrm/zones'
import { HrZoneName } from '../../../../lib/shared/hr-zones'

describe('lib/hrm/zones', () => {
  const maxHr = 200

  describe('calculateHrZone', () => {
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

    it('should return "Rest" for HR below the lowest zone', () => {
      const result = calculateHrZone(90, maxHr) // 45% of 200
      expect(result.zoneName).toBe(HrZoneName.Rest)
      expect(result.percentage).toBe(45)
    })

    it('should correctly calculate the "Warm-up" zone', () => {
      const result = calculateHrZone(110, maxHr) // 55%
      expect(result.zoneName).toBe(HrZoneName.WarmUp)
      expect(result.percentage).toBe(55)
      expect(result.bpm).toBe(110)
    })

    it('should correctly calculate the "Fat Burn" zone', () => {
      const result = calculateHrZone(130, maxHr) // 65%
      expect(result.zoneName).toBe(HrZoneName.FatBurn)
      expect(result.percentage).toBe(65)
    })

    it('should correctly calculate the "Cardio" zone', () => {
      const result = calculateHrZone(150, maxHr) // 75%
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(75)
    })

    it('should correctly calculate the "Peak" zone', () => {
      const result = calculateHrZone(180, maxHr) // 90%
      expect(result.zoneName).toBe(HrZoneName.Peak)
      expect(result.percentage).toBe(90)
    })

    it('should correctly calculate the "Max" zone', () => {
      const result = calculateHrZone(196, maxHr) // 98%
      expect(result.zoneName).toBe(HrZoneName.Max)
      expect(result.percentage).toBe(98)
    })

    // --- Boundary Condition Tests ---
    it('should correctly handle the exact lower boundary of a zone', () => {
      const result = calculateHrZone(140, maxHr) // 70%, start of Cardio
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(70)
    })

    it('should correctly handle the exact upper boundary of a zone (exclusive)', () => {
      // 140 is 70% of 200, which is the *exclusive* end of Fat Burn
      const result = calculateHrZone(139, maxHr) // 69.5% -> 70% rounded
      expect(result.zoneName).toBe(HrZoneName.FatBurn)
      expect(result.percentage).toBe(70)
    })

    it('should handle HR values exceeding the maximum', () => {
      const result = calculateHrZone(220, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      expect(result.percentage).toBe(100) // Capped at 100
      expect(result.bpm).toBe(220)
    })
  })

  describe('getZoneBpmRange', () => {
    it('should correctly format the BPM range for a standard zone', () => {
      const cardioZone = HR_ZONE_DEFINITIONS.find(
        (z) => z.name === HrZoneName.Cardio
      )!
      const result = getZoneBpmRange(cardioZone, maxHr)
      // min: 0.7 * 200 = 140
      // max: 0.85 * 200 = 170. Display should be 169.
      expect(result).toBe('140-169 BPM')
    })

    it('should correctly format the BPM range for the "Max" zone', () => {
      const maxZone = HR_ZONE_DEFINITIONS.find(
        (z) => z.name === HrZoneName.Max
      )!
      const result = getZoneBpmRange(maxZone, maxHr)
      // min: 0.95 * 200 = 190
      expect(result).toBe('190+ BPM')
    })
  })
})
